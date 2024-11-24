import {
  DeviceSourceManager,
  DeviceType,
  Engine,
  Vector2,
} from "@babylonjs/core";

enum CONTROL_SCHEME {
  WASD = 0,
  ARROW = 1,
}

export type Controller = {
  id: number;
  input: INPUT_DATA;
};

type INPUT_DATA = {
  dir: Vector2; // joystick axis
  action: boolean; // action button down / up
};

// Track each control scheme input value in current frame
export class InputSystem {
  private _deviceSourceManager: DeviceSourceManager;

  private _controllers: Map<CONTROL_SCHEME, Controller> = new Map();

  constructor(engine: Engine) {
    this._deviceSourceManager = new DeviceSourceManager(engine);
  }

  public getController(id: number) {
    return Array.from(this._controllers.values()).find((e) => e.id == id);
  }

  public update(dt: number) {
    let keyboard = this._deviceSourceManager.getDeviceSource(
      DeviceType.Keyboard
    );

    if (keyboard != null) {
      // ARROW KEYS
      let x_axis = keyboard.getInput(37) * -1 + keyboard.getInput(39);
      let y_axis = keyboard.getInput(40) * -1 + keyboard.getInput(38);
      let action = keyboard.getInput(32); // spacebar
      let dir = new Vector2(x_axis, y_axis);
      this.setController(CONTROL_SCHEME.ARROW, {
        dir: dir,
        action: action > 0,
      });

      // WASD
      x_axis = keyboard.getInput(65) * -1 + keyboard.getInput(68); // a and d
      y_axis = keyboard.getInput(83) * -1 + keyboard.getInput(87); // s and w
      action = keyboard.getInput(69); // e
      dir = new Vector2(x_axis, y_axis);
      this.setController(CONTROL_SCHEME.WASD, {
        dir: dir,
        action: action > 0,
      });
    }
  }

  private setController(scheme: CONTROL_SCHEME, input: INPUT_DATA) {
    if (this._controllers.has(scheme)) {
      this._controllers.get(scheme)!.input = input;
    } else {
      // NEW PLAYER/CONTROLLER
      if (Math.abs(input.dir.length()) > 0) {
        this._controllers.set(scheme, {
          id: this._controllers.size,
          input: input,
        });
      }
    }
  }
}
