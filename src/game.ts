import {
  ArcRotateCamera,
  Camera,
  Engine,
  HemisphericLight,
  Light,
  Mesh,
  MeshBuilder,
  Scene,
  Vector2,
  Vector3,
} from "@babylonjs/core";
import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import RAPIER from "@dimforge/rapier2d-compat";
import { PhysicsSystem } from "./systems/physics";
import { createProjectile } from "./entities/projectile";
import { createPlayer } from "./entities/player";
import { InputSystem } from "./systems/input-system";
import { PlayerMovementSystem } from "./systems/player-movement";
import { createBase, createBaseBlock } from "./entities/base";
import { WORLD_SIZE } from "./world";
import { damageSystem } from "./systems/damage-system";
import { cleanupSystem } from "./systems/cleanup-system";

export class Game {
  private _canvas: HTMLCanvasElement;
  private _engine: Engine;
  private _scene: Scene;

  private _physics: PhysicsSystem;
  private _input: InputSystem;
  private _playerMovement: PlayerMovementSystem;

  private _camera?: Camera;
  private _mainLight?: Light;

  debugPanel?: HTMLElement;

  constructor(rootElement: HTMLElement) {
    // create the canvas html element and attach it to the webpage
    var canvas = document.createElement("canvas");
    canvas.style.width = "80vw";
    canvas.style.height = "80vh";
    canvas.id = "gameCanvas";
    rootElement?.appendChild(canvas);
    this._canvas = canvas;

    // initialize babylon scene and engine
    this._engine = new Engine(canvas, true);
    this._scene = new Scene(this._engine);

    this._physics = new PhysicsSystem();
    this._input = new InputSystem(this._engine);
    this._playerMovement = new PlayerMovementSystem();

    /*
      SceneLoader.Append(
        "models/tiles/base/",
        "hex_grass.gltf",
        scene,
        undefined,
        undefined,
        undefined,
        ".gltf"
      );
      */

    // hide/show the Inspector
    window.addEventListener("keydown", (ev) => {
      // Shift+Ctrl+Alt+I
      if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
        if (this._scene.debugLayer.isVisible()) {
          this._scene.debugLayer.hide();
        } else {
          this._scene.debugLayer.show({ embedMode: false });
        }
      }
    });
  }

  async init() {
    // Make sure physics WASM bundle is initialized before starting rendering loop.
    // Physics objects cannot be created until after physics engine is initialized.
    await this._physics.init();

    this.initDebugDisplay();

    // --- CAMERA ---
    this._camera = new ArcRotateCamera(
      "Camera",
      -Math.PI / 2, //Math.PI / 4,
      0, //Math.PI / 4,
      50,
      Vector3.Zero(),
      this._scene
    );
    this._camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    //camera.attachControl(canvas, true);

    // --- LIGHTS ---
    this._mainLight = new HemisphericLight(
      "light1",
      new Vector3(1, 1, 0),
      this._scene
    );

    // Setup resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Todo -- rate limit this somehow?
        console.log("engine resize triggered");
        this._engine.resize();
        this._scene.render();
      }
      const w = this._engine.getRenderWidth(),
        h = this._engine.getRenderHeight();

      // TODO -- remove dependency on camera?
      if (this._scene.activeCamera) {
        this._scene.activeCamera.orthoLeft = (-15 * w) / h;
        this._scene.activeCamera.orthoTop = 15;
        this._scene.activeCamera.orthoRight = (15 * w) / h;
        this._scene.activeCamera.orthoBottom = -15;
      }
    });
    resizeObserver.observe(this._canvas);

    // TODO -- move out to createWorld??
    var ground: Mesh = MeshBuilder.CreateGround(
      "ground",
      {
        width: WORLD_SIZE,
        height: WORLD_SIZE,
      },
      this._scene
    );
    ground.translate(Vector3.Down(), 1);

    // TODO -- Create game systems here

    // Setup players
    for (let i = 0; i < 3; i++) {
      let ball = createProjectile(this._scene, this._physics);
    }

    let player = await createPlayer(this._scene, this._physics, 0, 0);
    for (let i = 0; i < 4; i++) {
      createBase(this._scene, this._physics, i, i);
    }

    // run the main render loop
    this._engine.runRenderLoop(() => {
      let dt = this._scene.getEngine().getDeltaTime();

      // Process input?
      this._input.update(dt);
      this._playerMovement.update(dt, this._input);

      // Runs physics update
      this._physics.fixedUpdate(dt);

      // TODO -- call update on systems here
      //this.updateList.forEach((e) => e.update(dt));
      damageSystem();
      cleanupSystem(this._physics);

      // Render scene
      this._scene.render();
    });
  }

  initDebugDisplay() {
    this.debugPanel = document.createElement("div");
    this.debugPanel.style.position = "absolute";
    this.debugPanel.style.top = "0";
    document.body.appendChild(this.debugPanel);
    /*
    this._scene.onBeforeRenderObservable.add(() => {
      if (this.ballRB != null && this.debugPanel != null) {
        let v = new Vector2(
          this.ballRB.linvel().x,
          this.ballRB.linvel().y
        ).length();
        this.debugPanel.textContent = `ball vel: ${v}`;
      }
    });
    */
  }
}
