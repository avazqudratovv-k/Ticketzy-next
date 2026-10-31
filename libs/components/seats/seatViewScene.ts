import {
	AmbientLight,
	BoxGeometry,
	BufferGeometry,
	Color,
	DirectionalLight,
	Fog,
	InstancedMesh,
	Material,
	Matrix4,
	Mesh,
	MeshLambertMaterial,
	PerspectiveCamera,
	PlaneGeometry,
	RingGeometry,
	Scene,
	WebGLRenderer,
} from 'three';
import { standingSize, tierColor, tierIndexes } from '../../seats/layout';
import { FocalArea, LayoutSection, SeatRef, TakenSeat } from '../../seats/types';
import {
	buildViewModel,
	SCALE,
	seatSize,
	startCamera,
	STAGE_BACKDROP_HEIGHT,
	STAGE_DECK_HEIGHT,
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
	/** accessible name of the canvas */
	label: string;
}

export interface SeatViewHandle {
	dispose: () => void;
}

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
	const mine = model.bySeat.get(`${input.seat.sectionKey}:${input.seat.row}:${input.seat.number}`);
	if (!mine) return null;
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
	const camera = new PerspectiveCamera(60, 1, 0.1, 400);
	camera.rotation.order = 'YXZ';

	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
	const canvas = renderer.domElement;
	canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline-offset:-2px';
	container.appendChild(canvas);

	scene.add(new AmbientLight(0xffffff, 1.5));
	const sun = new DirectionalLight(0xffffff, 1.6);
	sun.position.set(20, 50, 30);
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

	// Ground
	const ground = new Mesh(track(new PlaneGeometry(400, 400)), solid((p) => p.surface));
	ground.rotation.x = -Math.PI / 2;
	ground.position.y = -0.02;
	scene.add(ground);

	// Stage or pitch
	const focal = model.focal;
	const fw = focal.width * SCALE;
	const fd = focal.height * SCALE;
	const fc = model.focalCenter;
	if (focal.type === 'STAGE') {
		addBox(fw + 0.3, 0.14, fd + 0.3, fc.x, STAGE_DECK_HEIGHT - 0.07, fc.z, solid((p) => p.accent));
		addBox(fw, STAGE_DECK_HEIGHT, fd, fc.x, STAGE_DECK_HEIGHT / 2, fc.z, solid((p) => p.raised.clone().lerp(p.ink, 0.12)));
		addBox(fw, STAGE_BACKDROP_HEIGHT, 0.3, fc.x, STAGE_BACKDROP_HEIGHT / 2, fc.z - fd / 2 - 0.15, solid((p) => p.sunken.clone().lerp(p.accent, 0.05)));
	} else {
		const field = new Mesh(track(new PlaneGeometry(fw, fd)), solid((p) => p.raised.clone().lerp(p.ink, 0.06)));
		field.rotation.x = -Math.PI / 2;
		field.position.set(fc.x, 0.02, fc.z);
		scene.add(field);
		const lineMaterial = solid((p) => p.line);
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

	// Standing areas: a flat patch
	for (const section of input.sections) {
		if (section.kind !== 'STANDING') continue;
		const { w, h } = standingSize(section);
		const at = toWorld(section.x, section.y);
		const color = resolve(tierColor(section.tierKey ? tiers.get(section.tierKey) : 0));
		addBox(w * SCALE, 0.08, h * SCALE, at.x, 0.04, at.z, solid((p) => p.surface.clone().lerp(color, 0.35)), -section.rotation * DEG);
	}

	// Seats: three instanced meshes (seat, back, riser under a tier) so even a stadium is three draw calls
	const seats = model.seats.filter((seat) => seat !== mine);
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
	seats.forEach((seat, i) => {
		const s = seatSize(seat.section) * 0.78;
		const facing = Math.atan2(-(fc.x - seat.x), -(fc.z - seat.z));
		place(baseMesh, i, s, 0.3, s * 0.85, seat.x, seat.y - 0.15, seat.z, facing);
		// the back sits behind the seat, away from the stage
		const back = s * 0.42;
		place(backMesh, i, s, 0.35, s * 0.14, seat.x + Math.sin(facing) * back, seat.y + 0.175, seat.z + Math.cos(facing) * back, facing);
	});
	risers.forEach((seat, i) => {
		const p = seatSize(seat.section);
		place(riserMesh, i, p, Math.max(seat.y - 0.3, 0.05), p, seat.x, Math.max(seat.y - 0.3, 0.05) / 2, seat.z, -seat.section.rotation * DEG);
	});
	[baseMesh, backMesh, riserMesh].forEach((mesh) => {
		mesh.instanceMatrix.needsUpdate = true;
		scene.add(mesh);
	});

	const myRow = mine ? `${mine.sectionKey}:${mine.row}:` : '';
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
			riserMesh.setColorAt(i, color.copy(p.sunken).lerp(resolve(tierColor(seat.section.tierKey ? tiers.get(seat.section.tierKey) : 0)), 0.15));
		});
		for (const mesh of [baseMesh, backMesh, riserMesh]) if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
	};

	const paint = () => {
		const p = readPalette();
		scene.background = p.bg.clone();
		scene.fog = new Fog(p.bg.clone(), 80, 200);
		paints.forEach((fn) => fn(p));
		paintSeats(p);
		schedule();
	};

	// Camera
	const start = startCamera(model, mine);
	camera.position.set(start.eye.x, start.eye.y, start.eye.z);
	let yaw = start.yaw;
	let pitch = start.pitch;
	let hfov = HFOV.start;
	const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
	const aim = () => {
		yaw = clamp(yaw, start.yaw - YAW_LIMIT, start.yaw + YAW_LIMIT);
		pitch = clamp(pitch, start.pitch - PITCH_DOWN, start.pitch + PITCH_UP);
		hfov = clamp(hfov, HFOV.min, HFOV.max);
		camera.rotation.set(pitch, yaw, 0);
		const aspect = camera.aspect || 1;
		camera.fov = Math.min(MAX_VFOV, (2 * Math.atan(Math.tan((hfov * DEG) / 2) / aspect)) / DEG);
		camera.updateProjectionMatrix();
		schedule();
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
			if (pinch > 0 && now > 0) hfov *= pinch / now;
			pinch = now;
		} else {
			yaw += (next.x - last.x) * degPerPx();
			pitch += (next.y - last.y) * degPerPx();
		}
		aim();
	};
	const onUp = (e: PointerEvent) => {
		pointers.delete(e.pointerId);
		pinch = 0;
	};
	const onWheel = (e: WheelEvent) => {
		e.preventDefault();
		hfov *= Math.exp(e.deltaY * 0.001);
		aim();
	};
	const onKey = (e: KeyboardEvent) => {
		const step = 4 * DEG;
		const moves: Record<string, () => void> = {
			ArrowLeft: () => (yaw += step),
			ArrowRight: () => (yaw -= step),
			ArrowUp: () => (pitch += step),
			ArrowDown: () => (pitch -= step),
			'+': () => (hfov *= 0.9),
			'=': () => (hfov *= 0.9),
			'-': () => (hfov *= 1.1),
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
			[baseMesh, backMesh, riserMesh].forEach((mesh) => mesh.dispose());
			geometries.forEach((g) => g.dispose());
			materials.forEach((m) => m.dispose());
			renderer.dispose();
			renderer.forceContextLoss();
			canvas.remove();
		},
	};
}
