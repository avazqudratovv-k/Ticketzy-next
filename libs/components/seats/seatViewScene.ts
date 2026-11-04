import {
	AmbientLight,
	BoxGeometry,
	BufferGeometry,
	Color,
	ConeGeometry,
	DirectionalLight,
	DoubleSide,
	Fog,
	HemisphereLight,
	InstancedMesh,
	Material,
	Matrix4,
	Mesh,
	MeshBasicMaterial,
	Object3D,
	MeshLambertMaterial,
	PerspectiveCamera,
	PlaneGeometry,
	RingGeometry,
	Scene,
	SphereGeometry,
	WebGLRenderer,
} from 'three';
import { standingSize, tierColor, tierIndexes } from '../../seats/layout';
import { pitchSurround } from '../../seats/surround';
import { FocalArea, LayoutSection, SeatRef, TakenSeat } from '../../seats/types';
import {
	buildViewModel,
	chairWidth,
	ROOF_CLEARANCE,
	roomBox,
	sectionShells,
	seatSize,
	SCALE as BASE_SCALE,
	startCamera,
	STAGE_DECK_HEIGHT,
	stageDepthOf,
	toWorld,
} from '../../seats/view3d';

/** The 3D scene of "View from your seat" (F391). This file is the only importer of `three`, and it is loaded only when the panel opens. */

export interface SeatViewInput {
	sections: LayoutSection[];
	focalArea?: Partial<FocalArea> | null;
	taken: Map<string, TakenSeat>;
	/** keys of every seat the buyer has selected */
	selected: Set<string>;
	seat: SeatRef;
	/** a venue with a stage is a closed room (walls, ceiling) unless this is false, for an open-air venue */
	indoor?: boolean;
	/** accessible name of the canvas */
	label: string;
}

export interface SeatViewHandle {
	dispose: () => void;
	/** Moves the camera to another seat of the same layout. False when the seat is not in the layout. */
	setSeat: (seat: SeatRef) => boolean;
	/** Looks at the stage or pitch again with the starting zoom */
	resetView: () => void;
	/** `overview`: the whole venue from above, ceilings and roofs hidden, drag to turn. `seat`: back in the chair. */
	setMode: (mode: 'seat' | 'overview') => void;
}

/** Same numbers every time, so the crowd does not shuffle when the theme changes or the panel reopens */
const seeded = (seed: number) => {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
};
const hash = (text: string) => [...text].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7);
const MAX_CROWD = 1400;

const DEG = Math.PI / 180;
const YAW_LIMIT = 60 * DEG;
const PITCH_DOWN = 25 * DEG;
const PITCH_UP = 20 * DEG;
const HFOV = { min: 40, max: 95, start: 75 };
const MAX_VFOV = 85;

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#808080';
/** `var(--tier-1)` or a plain color to a THREE.Color */
const resolve = (value: string) => {
	const match = /^var\((--[\w-]+)\)$/.exec(value);
	return new Color(match ? cssVar(match[1]) : value);
};

function readPalette() {
	return {
		bg: new Color(cssVar('--bg')),
		surface: new Color(cssVar('--surface')),
		raised: new Color(cssVar('--surface-raised')),
		sunken: new Color(cssVar('--surface-sunken')),
		border: new Color(cssVar('--border')),
		line: new Color(cssVar('--border-control')),
		accent: new Color(cssVar('--accent')),
		ink: new Color(cssVar('--ink')),
	};
}
type Palette = ReturnType<typeof readPalette>;

/** Builds the scene in `container`. Returns `null` when WebGL is not available or the seat is not in the layout. */
export function createSeatView(container: HTMLElement, input: SeatViewInput): SeatViewHandle | null {
	const model = buildViewModel(input.sections, input.focalArea);
	let mine = model.bySeat.get(`${input.seat.sectionKey}:${input.seat.row}:${input.seat.number}`);
	if (!mine) return null;
	/** meters per canvas unit, and how much bigger than a stage venue the world is */
	const SCALE = model.scale;
	const GROW = Math.max(1, SCALE / BASE_SCALE);
	const indoor = model.focal.type === 'STAGE' && input.indoor !== false;
	let renderer: WebGLRenderer;
	try {
		renderer = new WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
		if (!renderer.getContext()) throw new Error('no context');
	} catch {
		return null;
	}

	const geometries: BufferGeometry[] = [];
	const materials: Material[] = [];
	const track = <T extends BufferGeometry>(g: T): T => (geometries.push(g), g);
	const lambert = () => {
		const m = new MeshLambertMaterial({ color: 0xffffff });
		materials.push(m);
		return m;
	};

	const tiers = tierIndexes(input.sections);
	const scene = new Scene();
	const camera = new PerspectiveCamera(60, 1, 0.1, 420 * GROW);
	camera.rotation.order = 'YXZ';

	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
	const canvas = renderer.domElement;
	canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline-offset:-2px';
	container.appendChild(canvas);

	// Sky and ground light make tops brighter than sides, so tiers, walls and roofs read as shapes
	scene.add(new AmbientLight(0xffffff, indoor ? 0.7 : 0.9));
	scene.add(new HemisphereLight(0xffffff, 0x8f95a3, indoor ? 0.8 : 1.0));
	const sun = new DirectionalLight(0xffffff, indoor ? 0.8 : 1.4);
	sun.position.set(20 * GROW, 50 * GROW, 30 * GROW);
	scene.add(sun);

	const addBox = (w: number, h: number, d: number, x: number, y: number, z: number, material: Material, ry = 0) => {
		const mesh = new Mesh(track(new BoxGeometry(w, h, d)), material);
		mesh.position.set(x, y, z);
		mesh.rotation.y = ry;
		scene.add(mesh);
		return mesh;
	};

	/** Parts whose color depends on the theme, repainted by `paint` */
	const paints: ((p: Palette) => void)[] = [];
	const solid = (color: (p: Palette) => Color) => {
		const material = lambert();
		paints.push((p) => (material as MeshLambertMaterial).color.copy(color(p)));
		return material;
	};
	/** Lit parts (screens, lamps): not shaded, so they read as light sources */
	const glow = (color: (p: Palette) => Color) => {
		const material = new MeshBasicMaterial({ color: 0xffffff });
		materials.push(material);
		paints.push((p) => material.color.copy(color(p)));
		return material;
	};
	const white = new Color('#ffffff');
	/** Walls, ceiling and roofs: hidden in the overview so the whole venue can be seen */
	const covers: Object3D[] = [];
	const cover = <T extends Object3D>(object: T): T => (covers.push(object), object);

	// Ground
	const ground = new Mesh(track(new PlaneGeometry(400 * GROW, 400 * GROW)), solid((p) => p.surface));
	ground.rotation.x = -Math.PI / 2;
	ground.position.y = -0.02;
	scene.add(ground);

	// Stage or pitch
	const focal = model.focal;
	const fw = focal.width * SCALE;
	const fd = focal.height * SCALE;
	const fc = model.focalCenter;
	const room = indoor ? roomBox(model) : null;
	if (focal.type === 'STAGE') {
		// The canvas stage is a thin bar, so in 3D it is deeper than drawn, growing backwards; the front edge stays where the map has it
		const sd = stageDepthOf(fw, fd);
		const frontZ = fc.z + fd / 2;
		const midZ = frontZ - sd / 2;
		const backZ = frontZ - sd;
		const ceiling = room?.height ?? 12;
		const top = Math.min(ceiling - 1.5, STAGE_DECK_HEIGHT + 6.5);
		const deckColor = solid((p) => p.raised.clone().lerp(p.ink, 0.12));
		addBox(fw + 0.3, 0.14, sd + 0.3, fc.x, STAGE_DECK_HEIGHT - 0.06, midZ, solid((p) => p.accent));
		addBox(fw, STAGE_DECK_HEIGHT, sd, fc.x, STAGE_DECK_HEIGHT / 2, midZ, deckColor);
		addBox(fw, top, 0.3, fc.x, top / 2, backZ - 0.15, solid((p) => p.sunken.clone().lerp(p.accent, 0.05)));
		// A video wall on the backdrop, speaker stacks, a lighting truss with lamps and beams, and the front barrier
		const wallHeight = Math.min(3, top - STAGE_DECK_HEIGHT - 1);
		addBox(fw * 0.7, wallHeight, 0.1, fc.x, STAGE_DECK_HEIGHT + 0.6 + wallHeight / 2, backZ + 0.05, glow((p) => p.accent.clone().lerp(white, 0.15)));
		const speaker = solid(() => new Color('#14171d'));
		const cone = solid(() => new Color('#2a2f3a'));
		for (const side of [-1, 1]) {
			const sx = fc.x + side * (fw / 2 - 1.2);
			for (let level = 0; level < 3; level += 1) {
				addBox(1.3, 1.1, 1.1, sx, STAGE_DECK_HEIGHT + 0.55 + level * 1.12, frontZ - sd * 0.18, speaker);
				addBox(0.8, 0.5, 0.05, sx, STAGE_DECK_HEIGHT + 0.55 + level * 1.12, frontZ - sd * 0.18 + 0.58, cone);
			}
		}
		const truss = solid(() => new Color('#3a404c'));
		const trussY = top - 0.4;
		const trussZ = frontZ - sd * 0.4;
		addBox(fw, 0.18, 0.18, fc.x, trussY, trussZ, truss);
		for (const side of [-1, 1]) addBox(0.18, trussY - STAGE_DECK_HEIGHT, 0.18, fc.x + side * (fw / 2 - 0.2), STAGE_DECK_HEIGHT + (trussY - STAGE_DECK_HEIGHT) / 2, trussZ, truss);
		const lamps = Math.max(3, Math.min(9, Math.round(fw / 2.5)));
		const lampMaterial = glow((p) => p.accent.clone().lerp(white, 0.6));
		const beamMaterial = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.09, depthWrite: false, side: DoubleSide });
		materials.push(beamMaterial);
		paints.push((p) => beamMaterial.color.copy(p.accent.clone().lerp(white, 0.4)));
		const beamLength = trussY - STAGE_DECK_HEIGHT - 0.4;
		const beam = track(new ConeGeometry(1.2, beamLength, 16, 1, true));
		for (let i = 0; i < lamps; i += 1) {
			const lx = fc.x - fw / 2 + 1 + ((fw - 2) * i) / (lamps - 1);
			addBox(0.45, 0.3, 0.45, lx, trussY - 0.25, trussZ, lampMaterial);
			const ray = new Mesh(beam, beamMaterial);
			ray.position.set(lx, trussY - 0.4 - beamLength / 2, trussZ);
			ray.rotation.set(0.18 + (i % 2) * 0.1, 0, (i / (lamps - 1) - 0.5) * 0.5);
			scene.add(ray);
		}
		addBox(fw + 2, 1.1, 0.12, fc.x, 0.55, frontZ + 1, solid((p) => p.line));
		// The proscenium: two columns and a header frame the opening, velvet curtains fold at both sides
		const frame = solid((p) => p.sunken.clone().lerp(p.ink, 0.1));
		const velvet = solid((p) => p.accent.clone().lerp(p.bg, 0.5));
		for (const side of [-1, 1]) {
			addBox(0.9, top, 0.9, fc.x + side * (fw / 2 + 0.45), top / 2, frontZ - 0.45, frame);
			for (let k = 0; k < 4; k += 1) {
				addBox(fw * 0.035, top - 1.3 - STAGE_DECK_HEIGHT, 0.12, fc.x + side * (fw / 2 - 0.3 - k * fw * 0.04), STAGE_DECK_HEIGHT + (top - 1.3 - STAGE_DECK_HEIGHT) / 2, frontZ - 0.9 + (k % 2) * 0.15, velvet);
			}
		}
		addBox(fw + 1.8, 1.3, 0.9, fc.x, top - 0.65, frontZ - 0.45, frame);
		addBox(fw, 0.3, 0.12, fc.x, top - 1.45, frontZ - 0.9, velvet);
	} else {
		/** Run-off, boards (1 m), two covered dugouts and the tunnel mouth, from the same geometry as the 2D map */
		const addSurround = (runColor: Color) => {
			const around = pitchSurround(focal);
			const at = (r: { x: number; y: number; w: number; h: number }) => {
				const c = toWorld(r.x + r.w / 2, r.y + r.h / 2, SCALE);
				return { x: c.x, z: c.z, w: r.w * SCALE, d: r.h * SCALE };
			};
			const run = at(around.runoff);
			addBox(run.w, 0.02, run.d, run.x, 0, run.z, solid(() => runColor));
			const board = solid((p) => p.line);
			for (const b of around.boards) {
				const r = at(b);
				addBox(r.w, 1, r.d, r.x, 0.5, r.z, board);
			}
			const wall = solid((p) => p.raised);
			const roof = solid((p) => p.line);
			for (const d of around.dugouts) {
				const r = at(d);
				addBox(r.w, 1.5, 0.06, r.x, 0.75, r.z - r.d / 2 + 0.03, wall);
				addBox(r.w + 0.2, 0.08, r.d + 0.2, r.x, 1.55, r.z, roof);
			}
			const tun = at(around.tunnel);
			addBox(tun.w, 2.2, tun.d, tun.x, 1.1, tun.z, solid(() => new Color('#0c0f14')));
		};
		// Grass, run-off and chalk are fixed colors (same as the 2D map); boards and dugouts follow the theme
		const grass = new Color('#276b32');
		const runGrass = new Color('#1c5226');
		const chalk = new Color('#ffffff');
		const field = new Mesh(track(new PlaneGeometry(fw, fd)), solid(() => grass));
		field.rotation.x = -Math.PI / 2;
		field.position.set(fc.x, 0.02, fc.z);
		scene.add(field);
		const lineMaterial = solid(() => chalk);
		const strip = (x: number, z: number, w: number, d: number) => addBox(w, 0.02, d, fc.x + x, 0.04, fc.z + z, lineMaterial);
		const t = 0.12;
		const rect = (cx: number, cz: number, w: number, d: number) => {
			strip(cx, cz - d / 2, w, t);
			strip(cx, cz + d / 2, w, t);
			strip(cx - w / 2, cz, t, d);
			strip(cx + w / 2, cz, t, d);
		};
		rect(0, 0, fw, fd);
		strip(0, 0, t, fd);
		addSurround(runGrass);
		// Four floodlight masts just outside the corners of the pitch
		const mast = solid(() => new Color('#8b919c'));
		const lamp = glow(() => new Color('#fff6d6'));
		for (const sx of [-1, 1]) {
			for (const sz of [-1, 1]) {
				const mx = fc.x + sx * (fw / 2 + 8);
				const mz = fc.z + sz * (fd / 2 + 8);
				addBox(0.5, 34, 0.5, mx, 17, mz, mast);
				addBox(4, 2.2, 0.4, mx, 34.5, mz, lamp, Math.atan2(fc.x - mx, fc.z - mz));
			}
		}
		const ring = new Mesh(track(new RingGeometry((fw * 9.15) / 105 - t / 2, (fw * 9.15) / 105 + t / 2, 48)), lineMaterial);
		ring.rotation.x = -Math.PI / 2;
		ring.position.set(fc.x, 0.04, fc.z);
		scene.add(ring);
		for (const side of [-1, 1]) {
			const edge = (side * fw) / 2;
			rect(edge - side * ((fw * 16.5) / 105 / 2), 0, (fw * 16.5) / 105, (fd * 40.3) / 68);
			rect(edge - side * ((fw * 5.5) / 105 / 2), 0, (fw * 5.5) / 105, (fd * 18.3) / 68);
			// goal frame
			const gw = (fd * 7.32) / 68;
			const post = solid((p) => p.ink);
			addBox(0.1, 1.6, 0.1, fc.x + edge, 0.8, fc.z - gw / 2, post);
			addBox(0.1, 1.6, 0.1, fc.x + edge, 0.8, fc.z + gw / 2, post);
			addBox(0.1, 0.1, gw, fc.x + edge, 1.6, fc.z, post);
		}
	}

	// The room of an indoor venue: floor, four walls with a lit band, a ceiling with recessed lights
	if (room) {
		const w = room.maxX - room.minX;
		const d = room.maxZ - room.minZ;
		const cx = (room.minX + room.maxX) / 2;
		const cz = (room.minZ + room.maxZ) / 2;
		const h = room.height;
		addBox(w, 0.1, d, cx, -0.07, cz, solid((p) => p.sunken.clone().lerp(p.accent, 0.04)));
		const wallMaterial = solid((p) => p.raised.clone().lerp(p.bg, 0.55));
		const band = glow((p) => p.accent.clone().lerp(p.bg, 0.55));
		cover(addBox(w, h, 0.4, cx, h / 2, room.minZ - 0.2, wallMaterial));
		cover(addBox(w, h, 0.4, cx, h / 2, room.maxZ + 0.2, wallMaterial));
		cover(addBox(0.4, h, d, room.minX - 0.2, h / 2, cz, wallMaterial));
		cover(addBox(0.4, h, d, room.maxX + 0.2, h / 2, cz, wallMaterial));
		cover(addBox(w, 0.12, 0.05, cx, 2.6, room.maxZ - 0.02, band));
		cover(addBox(0.05, 0.12, d, room.minX + 0.02, 2.6, cz, band));
		cover(addBox(0.05, 0.12, d, room.maxX - 0.02, 2.6, cz, band));
		cover(addBox(w + 0.8, 0.4, d + 0.8, cx, h + 0.2, cz, solid((p) => p.sunken.clone().lerp(p.bg, 0.3))));
		const spots: { x: number; z: number }[] = [];
		for (let x = room.minX + 3; x < room.maxX - 1; x += 6) for (let z = room.minZ + 3; z < room.maxZ - 1; z += 6) spots.push({ x, z });
		const panels = cover(new InstancedMesh(track(new BoxGeometry(1, 0.06, 1)), glow((p) => p.ink.clone().lerp(p.bg, 0.25)), spots.length));
		spots.forEach((spot, i) => panels.setMatrixAt(i, new Matrix4().setPosition(spot.x, h - 0.04, spot.z)));
		scene.add(panels);
	}

	// Standing areas: a flat patch with a crowd on it
	const crowdAreas: { key: string; x: number; z: number; w: number; d: number; ry: number; capacity: number }[] = [];
	for (const section of input.sections) {
		if (section.kind !== 'STANDING') continue;
		const { w, h } = standingSize(section);
		const at = toWorld(section.x, section.y, SCALE);
		const color = resolve(tierColor(section.tierKey ? tiers.get(section.tierKey) : 0));
		addBox(w * SCALE, 0.08, h * SCALE, at.x, 0.04, at.z, solid((p) => p.surface.clone().lerp(color, 0.35)), -section.rotation * DEG);
		crowdAreas.push({ key: section.key, x: at.x, z: at.z, w: w * SCALE, d: h * SCALE, ry: -section.rotation * DEG, capacity: section.capacity ?? 100 });
	}
	// The crowd: a head and a body per person, jittered on a grid, the same every time (at most MAX_CROWD in all)
	const people: { x: number; z: number; shade: number }[] = [];
	for (const area of crowdAreas) {
		const count = Math.min(area.capacity, Math.floor(MAX_CROWD / crowdAreas.length));
		const random = seeded(hash(area.key));
		const step = Math.max(0.6, Math.sqrt((area.w * area.d) / Math.max(1, count)));
		const columns = Math.max(1, Math.floor(area.w / step));
		const lines = Math.max(1, Math.floor(area.d / step));
		const cos = Math.cos(area.ry);
		const sin = Math.sin(area.ry);
		for (let i = 0; i < Math.min(count, columns * lines); i += 1) {
			const lx = ((i % columns) + 0.5 + (random() - 0.5) * 0.6) * (area.w / columns) - area.w / 2;
			const lz = (Math.floor(i / columns) + 0.5 + (random() - 0.5) * 0.6) * (area.d / lines) - area.d / 2;
			people.push({ x: area.x + lx * cos + lz * sin, z: area.z - lx * sin + lz * cos, shade: random() });
		}
	}
	const bodyGeometry = track(new BoxGeometry(0.42, 1.15, 0.28));
	const headGeometry = track(new SphereGeometry(0.12, 8, 6));
	const bodies = new InstancedMesh(bodyGeometry, lambert(), people.length);
	const heads = new InstancedMesh(headGeometry, lambert(), people.length);
	{
		const m = new Matrix4();
		people.forEach((person, i) => {
			m.makeRotationY(person.shade * Math.PI).setPosition(person.x, 0.62, person.z);
			bodies.setMatrixAt(i, m);
			m.makeTranslation(person.x, 1.34, person.z);
			heads.setMatrixAt(i, m);
		});
		bodies.instanceMatrix.needsUpdate = true;
		heads.instanceMatrix.needsUpdate = true;
		if (people.length) scene.add(bodies, heads);
	}

	// Seats: three instanced meshes (seat, back, riser under a tier) so even a stadium is three draw calls.
	// Every seat is drawn; the one the camera sits in is scaled to nothing, so the buyer can move to another seat.
	const seats = model.seats;
	const seatedShade: number[] = [];
	const indexOf = new Map(seats.map((seat, i) => [seat.key, i]));
	const unit = track(new BoxGeometry(1, 1, 1));
	const baseMesh = new InstancedMesh(unit, lambert(), seats.length);
	const backMesh = new InstancedMesh(unit, lambert(), seats.length);
	const risers = seats.filter((seat) => seat.level > 0);
	const riserMesh = new InstancedMesh(unit, lambert(), risers.length);
	const matrix = new Matrix4();
	const rotation = new Matrix4();
	const place = (mesh: InstancedMesh, i: number, sx: number, sy: number, sz: number, x: number, y: number, z: number, ry: number) => {
		matrix.makeScale(sx, sy, sz).premultiply(rotation.makeRotationY(ry));
		matrix.setPosition(x, y, z);
		mesh.setMatrixAt(i, matrix);
	};
	const placeChair = (i: number) => {
		const seat = seats[i];
		const s = chairWidth(seatSize(seat.section, SCALE), SCALE);
		const facing = Math.atan2(-(fc.x - seat.x), -(fc.z - seat.z));
		place(baseMesh, i, s, 0.3, s * 0.85, seat.x, seat.y - 0.15, seat.z, facing);
		// the back sits behind the seat, away from the stage
		const back = s * 0.42;
		place(backMesh, i, s, 0.35, s * 0.14, seat.x + Math.sin(facing) * back, seat.y + 0.175, seat.z + Math.cos(facing) * back, facing);
	};
	const hideChair = (i: number) => {
		matrix.makeScale(0, 0, 0);
		baseMesh.setMatrixAt(i, matrix);
		backMesh.setMatrixAt(i, matrix);
	};
	const flushChairs = () => {
		baseMesh.instanceMatrix.needsUpdate = true;
		backMesh.instanceMatrix.needsUpdate = true;
	};
	seats.forEach((_, i) => placeChair(i));
	hideChair(indexOf.get(mine.key) ?? 0);
	risers.forEach((seat, i) => {
		const p = seatSize(seat.section, SCALE);
		place(riserMesh, i, p, Math.max(seat.y - 0.3, 0.05), p, seat.x, Math.max(seat.y - 0.3, 0.05) / 2, seat.z, -seat.section.rotation * DEG);
	});
	[baseMesh, backMesh, riserMesh].forEach((mesh) => {
		mesh.instanceMatrix.needsUpdate = true;
		scene.add(mesh);
	});

	// People in the seats that are taken (not the buyer's own): a torso and a head each, facing the stage or pitch
	const occupied = seats.filter((seat) => {
		const taken = input.taken.get(seat.key);
		return Boolean(taken && !taken.mine);
	});
	const torsos = new InstancedMesh(track(new BoxGeometry(0.4, 0.55, 0.26)), lambert(), occupied.length);
	const faces = new InstancedMesh(track(new SphereGeometry(0.115, 8, 6)), lambert(), occupied.length);
	occupied.forEach((seat, i) => {
		const facing = Math.atan2(-(fc.x - seat.x), -(fc.z - seat.z));
		const shade = ((hash(seat.key) % 100) / 100) * 0.4;
		matrix.makeRotationY(facing).setPosition(seat.x + Math.sin(facing) * 0.12, seat.y + 0.55, seat.z + Math.cos(facing) * 0.12);
		torsos.setMatrixAt(i, matrix);
		matrix.makeTranslation(seat.x + Math.sin(facing) * 0.1, seat.y + 0.98, seat.z + Math.cos(facing) * 0.1);
		faces.setMatrixAt(i, matrix);
		seatedShade.push(shade);
	});
	torsos.instanceMatrix.needsUpdate = true;
	faces.instanceMatrix.needsUpdate = true;
	if (occupied.length) scene.add(torsos, faces);

	// Rails in front of each tier, and a back wall and a roof on the top tier: they frame the view and can hide a little of it, as in the venue
	const railMaterial = solid((p) => p.line);
	const wallMaterial = solid((p) => p.sunken.clone().lerp(p.ink, 0.08));
	const roofMaterial = solid((p) => p.raised.clone().lerp(p.bg, 0.25));
	for (const shell of sectionShells(model)) {
		if (shell.level < 1) continue;
		const rail = { x: shell.front.x - shell.out.x * shell.cell * 0.5, z: shell.front.z - shell.out.z * shell.cell * 0.5 };
		addBox(shell.rowLength, 0.07, 0.07, rail.x, shell.front.y + 0.85, rail.z, railMaterial, shell.ry);
		addBox(shell.rowLength, 0.05, 0.05, rail.x, shell.front.y + 0.45, rail.z, railMaterial, shell.ry);
		if (!shell.isTop || indoor) continue;
		const wallGap = shell.cell * 0.6;
		const wallBottom = shell.back.y - 0.3;
		const wallHeight = ROOF_CLEARANCE + 0.3;
		const wall = { x: shell.back.x + shell.out.x * wallGap, z: shell.back.z + shell.out.z * wallGap };
		cover(addBox(shell.rowLength, wallHeight, 0.3, wall.x, wallBottom + wallHeight / 2, wall.z, wallMaterial, shell.ry));
		// the roof reaches a quarter of the section's depth past the front row
		const overhang = shell.depth * 0.25;
		const span = shell.depth + overhang + wallGap;
		const mid = (overhang + wallGap) / 2;
		cover(
			addBox(
				shell.rowLength,
				0.4,
				span,
				shell.front.x + shell.out.x * (shell.depth / 2 + mid - overhang),
				wallBottom + wallHeight,
				shell.front.z + shell.out.z * (shell.depth / 2 + mid - overhang),
				roofMaterial,
				shell.ry,
			),
		);
	}

	let myRow = `${mine.sectionKey}:${mine.row}:`;
	const paintSeats = (p: Palette) => {
		const color = new Color();
		seats.forEach((seat, i) => {
			const tier = resolve(tierColor(seat.section.tierKey ? tiers.get(seat.section.tierKey) : 0));
			const taken = input.taken.get(seat.key);
			if (input.selected.has(seat.key)) color.copy(p.accent);
			else if (taken && !taken.mine) color.copy(tier).lerp(p.bg, 0.7);
			else if (seat.key.startsWith(myRow)) color.copy(tier).lerp(p.ink, 0.35);
			else color.copy(tier).lerp(p.bg, 0.3);
			baseMesh.setColorAt(i, color);
			backMesh.setColorAt(i, color);
		});
		risers.forEach((seat, i) => {
			riserMesh.setColorAt(i, color.copy(p.sunken).lerp(resolve(tierColor(seat.section.tierKey ? tiers.get(seat.section.tierKey) : 0)), 0.3));
		});
		occupied.forEach((_, i) => {
			torsos.setColorAt(i, color.copy(p.ink).lerp(p.bg, 0.45 + seatedShade[i]).lerp(p.accent, seatedShade[i] > 0.37 ? 0.45 : 0));
			faces.setColorAt(i, color.copy(p.ink).lerp(p.bg, 0.25));
		});
		people.forEach((person, i) => {
			bodies.setColorAt(i, color.copy(p.ink).lerp(p.bg, 0.35 + person.shade * 0.4).lerp(p.accent, person.shade > 0.85 ? 0.5 : 0));
			heads.setColorAt(i, color.copy(p.ink).lerp(p.bg, 0.2));
		});
		for (const mesh of [baseMesh, backMesh, riserMesh, bodies, heads, torsos, faces]) if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
	};

	const paint = () => {
		const p = readPalette();
		scene.background = p.bg.clone();
		scene.fog = new Fog(p.bg.clone(), 80 * GROW, 200 * GROW);
		paints.forEach((fn) => fn(p));
		paintSeats(p);
		schedule();
	};

	// Camera
	let start = startCamera(model, mine);
	camera.position.set(start.eye.x, start.eye.y, start.eye.z);
	let yaw = start.yaw;
	let pitch = start.pitch;
	let hfov = HFOV.start;
	const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
	// Overview: the camera circles the middle of the venue; the buyer's seat gets a marker
	let mode: 'seat' | 'overview' = 'seat';
	const extent = (() => {
		let minX = Infinity;
		let maxX = -Infinity;
		let minZ = Infinity;
		let maxZ = -Infinity;
		for (const seat of seats) {
			minX = Math.min(minX, seat.x);
			maxX = Math.max(maxX, seat.x);
			minZ = Math.min(minZ, seat.z);
			maxZ = Math.max(maxZ, seat.z);
		}
		return { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, radius: Math.max(10, Math.hypot(maxX - minX, maxZ - minZ) / 2) };
	})();
	const orbit = { az: 0, el: 0.75, dist: extent.radius * 1.7 };
	const marker = new Mesh(track(new SphereGeometry(Math.max(0.5, extent.radius * 0.012), 12, 8)), glow((p) => p.accent));
	marker.visible = false;
	scene.add(marker);
	const placeMarker = () => marker.position.set(mine!.x, mine!.y + 1.2, mine!.z);
	placeMarker();
	const aim = () => {
		if (mode === 'overview') {
			orbit.el = clamp(orbit.el, 0.12, 1.45);
			orbit.dist = clamp(orbit.dist, extent.radius * 0.4, extent.radius * 3.2);
			camera.position.set(
				extent.x + orbit.dist * Math.sin(orbit.az) * Math.cos(orbit.el),
				2 + orbit.dist * Math.sin(orbit.el),
				extent.z + orbit.dist * Math.cos(orbit.az) * Math.cos(orbit.el),
			);
			camera.lookAt(extent.x, 2, extent.z);
			camera.fov = 50;
			camera.updateProjectionMatrix();
			schedule();
			return;
		}
		yaw = clamp(yaw, start.yaw - YAW_LIMIT, start.yaw + YAW_LIMIT);
		pitch = clamp(pitch, start.pitch - PITCH_DOWN, start.pitch + PITCH_UP);
		hfov = clamp(hfov, HFOV.min, HFOV.max);
		camera.rotation.set(pitch, yaw, 0);
		const aspect = camera.aspect || 1;
		camera.fov = Math.min(MAX_VFOV, (2 * Math.atan(Math.tan((hfov * DEG) / 2) / aspect)) / DEG);
		camera.updateProjectionMatrix();
		schedule();
	};

	function resetView() {
		orbit.az = 0;
		orbit.el = 0.75;
		orbit.dist = extent.radius * 1.7;
		yaw = start.yaw;
		pitch = start.pitch;
		hfov = HFOV.start;
	}
	/** Looking around: seat mode turns the head, overview mode circles the venue */
	const turn = (dx: number, dy: number) => {
		if (mode === 'overview') {
			orbit.az -= dx;
			orbit.el += dy;
		} else {
			yaw += dx;
			pitch += dy;
		}
	};
	const zoom = (factor: number) => {
		if (mode === 'overview') orbit.dist *= factor;
		else hfov *= factor;
	};
	const setMode = (next: 'seat' | 'overview') => {
		mode = next;
		covers.forEach((object) => (object.visible = next === 'seat'));
		marker.visible = next === 'overview';
		if (next === 'seat') camera.position.set(start.eye.x, start.eye.y, start.eye.z);
		aim();
	};
	const setSeat = (seat: SeatRef) => {
		const next = model.bySeat.get(`${seat.sectionKey}:${seat.row}:${seat.number}`);
		const nextIndex = next ? indexOf.get(next.key) : undefined;
		if (!next || nextIndex === undefined) return false;
		if (next === mine) {
			resetView();
			aim();
			return true;
		}
		placeChair(indexOf.get(mine!.key) ?? 0);
		hideChair(nextIndex);
		flushChairs();
		mine = next;
		myRow = `${next.sectionKey}:${next.row}:`;
		start = startCamera(model, next);
		if (mode === 'seat') camera.position.set(start.eye.x, start.eye.y, start.eye.z);
		placeMarker();
		resetView();
		paintSeats(readPalette());
		aim();
		return true;
	};

	// Rendering: only when something changed, never while the tab is hidden
	let raf = 0;
	let disposed = false;
	function frame() {
		raf = 0;
		if (disposed || document.hidden) return;
		renderer.render(scene, camera);
	}
	function schedule() {
		if (!raf && !disposed && !document.hidden) raf = requestAnimationFrame(frame);
	}
	const onVisibility = () => schedule();
	document.addEventListener('visibilitychange', onVisibility);

	const resize = () => {
		const w = Math.max(1, container.clientWidth);
		const h = Math.max(1, container.clientHeight);
		renderer.setSize(w, h, false);
		camera.aspect = w / h;
		aim();
	};
	const observer = new ResizeObserver(resize);
	observer.observe(container);

	// Look around: drag, arrows; zoom: wheel, pinch, + and -
	const pointers = new Map<number, { x: number; y: number }>();
	let pinch = 0;
	const degPerPx = () => camera.fov / Math.max(1, container.clientHeight) * DEG;
	const onDown = (e: PointerEvent) => {
		pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
		canvas.setPointerCapture(e.pointerId);
		if (pointers.size === 2) {
			const [a, b] = [...pointers.values()];
			pinch = Math.hypot(a.x - b.x, a.y - b.y);
		}
	};
	const onMove = (e: PointerEvent) => {
		const last = pointers.get(e.pointerId);
		if (!last) return;
		const next = { x: e.clientX, y: e.clientY };
		pointers.set(e.pointerId, next);
		if (pointers.size === 2) {
			const [a, b] = [...pointers.values()];
			const now = Math.hypot(a.x - b.x, a.y - b.y);
			if (pinch > 0 && now > 0) zoom(pinch / now);
			pinch = now;
		} else {
			turn((next.x - last.x) * degPerPx(), (next.y - last.y) * degPerPx());
		}
		aim();
	};
	const onUp = (e: PointerEvent) => {
		pointers.delete(e.pointerId);
		pinch = 0;
	};
	const onWheel = (e: WheelEvent) => {
		e.preventDefault();
		zoom(Math.exp(e.deltaY * 0.001));
		aim();
	};
	const onKey = (e: KeyboardEvent) => {
		const step = 4 * DEG;
		const moves: Record<string, () => void> = {
			ArrowLeft: () => turn(step, 0),
			ArrowRight: () => turn(-step, 0),
			ArrowUp: () => turn(0, step),
			ArrowDown: () => turn(0, -step),
			'+': () => zoom(0.9),
			'=': () => zoom(0.9),
			'-': () => zoom(1.1),
			r: () => resetView(),
			R: () => resetView(),
			Home: () => resetView(),
		};
		const move = moves[e.key];
		if (!move) return;
		e.preventDefault();
		move();
		aim();
	};
	canvas.addEventListener('pointerdown', onDown);
	canvas.addEventListener('pointermove', onMove);
	canvas.addEventListener('pointerup', onUp);
	canvas.addEventListener('pointercancel', onUp);
	canvas.addEventListener('wheel', onWheel, { passive: false });
	canvas.addEventListener('keydown', onKey);

	// The theme can change while the panel is open
	const themeObserver = new MutationObserver(paint);
	themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

	canvas.tabIndex = 0;
	canvas.setAttribute('role', 'img');
	canvas.setAttribute('aria-label', input.label);
	paint();
	resize();

	return {
		setSeat,
		setMode,
		resetView: () => {
			resetView();
			aim();
		},
		dispose() {
			if (disposed) return;
			disposed = true;
			if (raf) cancelAnimationFrame(raf);
			observer.disconnect();
			themeObserver.disconnect();
			document.removeEventListener('visibilitychange', onVisibility);
			canvas.removeEventListener('pointerdown', onDown);
			canvas.removeEventListener('pointermove', onMove);
			canvas.removeEventListener('pointerup', onUp);
			canvas.removeEventListener('pointercancel', onUp);
			canvas.removeEventListener('wheel', onWheel);
			canvas.removeEventListener('keydown', onKey);
			[baseMesh, backMesh, riserMesh, bodies, heads, torsos, faces].forEach((mesh) => mesh.dispose());
			geometries.forEach((g) => g.dispose());
			materials.forEach((m) => m.dispose());
			renderer.dispose();
			renderer.forceContextLoss();
			canvas.remove();
		},
	};
}
