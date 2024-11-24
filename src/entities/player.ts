import {
  Color3,
  Mesh,
  MeshBuilder,
  Quaternion,
  Scene,
  SceneLoader,
  Space,
  StandardMaterial,
  Vector2,
  Vector3,
  VertexData,
} from "@babylonjs/core";
import RAPIER from "@dimforge/rapier2d-compat";
import { PhysicsSystem } from "../systems/physics";
import { createEntity } from "./entity";
import { WORLD_BASES } from "../world";

const PADDLE_X = 3;
const PADDLE_Y = 1;
const PADDLE_Z = 1;

export async function createPlayer(
  scene: Scene,
  physics: PhysicsSystem,
  controllerId?: number,
  baseIndex = 0
) {
  let obj = createEntity();

  let paddle = createPaddle(scene, physics, baseIndex, 5.8);
  obj.mesh = paddle.mesh;
  obj.rigidBody = paddle.rigidBody;
  obj.colliders = paddle.colliders;
  physics.registerRigidBody(obj.rigidBody, obj);
  obj.colliders.forEach((c) => {
    physics.registerCollider(c, obj);
  });

  obj.currentPosition = obj.mesh.absolutePosition.clone();
  obj.lastPosition = obj.currentPosition.clone();

  // catch/launch settings
  obj.attachSensor = paddle.catchSensor;
  obj.sensorTriggerCooldown = 100; // in ms
  obj.heldEntity = null;
  obj.launchForce = 25;

  // Connect input
  obj.controllerId = controllerId;
  obj.currentAngle = 0;
  obj.angularSpeed = 180; // degrees per second
  //obj.pivotPoint = new Vector2(pos.x, pos.z - 3);
  //obj.pivotLength = Vector2.Distance(obj.pivotPoint, { x: pos.x, y: pos.z });
  obj.paddleMin = -90;
  obj.paddleMax = 90;

  return obj;
}

const PADDLE_QUADS = 10;
const PADDLE_INNER_SIZE = 4;
const PADDLE_OUTER_SIZE = 2;
const PADDLE_THICKNESS = 1;
const PADDLE_CATCH_RADIUS = 1;
const PADDLE_CATCH_CENTER_DISTANCE = 0.5;
const PADDLE_CATCH_SENSOR_RADIUS = PADDLE_CATCH_RADIUS * 0.5; // Actual radius the catch zone will trigger

function createPaddle(
  scene: Scene,
  physics: PhysicsSystem,
  baseIndex: number,
  radius: number
) {
  /*
  const container = await SceneLoader.LoadAssetContainerAsync(
    "models/",
    "paddle.glb",
    scene,
    null,
    ".glb"
  );
  container.addAllToScene();
  //container.addToScene((m) => m.name === "Paddle");
  */

  // For now we will construct this by repurposing the base block code
  let vertices: number[] = [];
  let indices: number[] = [];
  let normals: number[] = [];

  let corePos = WORLD_BASES[baseIndex].corePosition;

  let innerRadius = radius;
  let outerRadius = radius + PADDLE_THICKNESS;

  let paddleCatchDistanceFromCore = outerRadius + PADDLE_CATCH_CENTER_DISTANCE;
  let paddleCatchPos = new Vector3(0, 0, paddleCatchDistanceFromCore);

  let paddleInnerAngle = PADDLE_INNER_SIZE / innerRadius;
  let paddleInnerStartAngle = Math.PI / 2 + paddleInnerAngle / 2;
  let paddleInnerQuadAngle = paddleInnerAngle / PADDLE_QUADS;

  let paddleOuterAngle = PADDLE_OUTER_SIZE / outerRadius;
  let paddleOuterStartAngle = Math.PI / 2 + paddleOuterAngle / 2;
  let paddleOuterQuadAngle = paddleOuterAngle / PADDLE_QUADS;

  // Store quads for physics body creation
  for (let i = 0; i < PADDLE_QUADS; i++) {
    let innerTheta1 = paddleInnerStartAngle - i * paddleInnerQuadAngle;
    let innerTheta2 = innerTheta1 - paddleInnerQuadAngle;

    let outerTheta1 = paddleOuterStartAngle - i * paddleOuterQuadAngle;
    let outerTheta2 = outerTheta1 - paddleOuterQuadAngle;

    let face = [];
    if (i == 0) {
      face.push(
        new Vector3(
          innerRadius * Math.cos(innerTheta1),
          0,
          innerRadius * Math.sin(innerTheta1)
        ),
        adjustForCircle(
          new Vector3(
            outerRadius * Math.cos(outerTheta1),
            0,
            outerRadius * Math.sin(outerTheta1)
          ),
          paddleCatchPos,
          PADDLE_CATCH_RADIUS
        )
      );
    }

    face.push(
      new Vector3(
        innerRadius * Math.cos(innerTheta2),
        0,
        innerRadius * Math.sin(innerTheta2)
      ),
      adjustForCircle(
        new Vector3(
          outerRadius * Math.cos(outerTheta2),
          0,
          outerRadius * Math.sin(outerTheta2)
        ),
        paddleCatchPos,
        PADDLE_CATCH_RADIUS
      )
    );

    face.forEach((f) => {
      vertices.push(f.x, f.y, f.z);
      normals.push(0, 1, 0);
    });
    let n = vertices.length / 3 - 1;
    indices.push(n - 1, n - 2, n - 3, n - 1, n, n - 2);
  }

  let vData = new VertexData();
  vData.positions = vertices;
  vData.normals = normals;
  vData.indices = indices;

  let mesh = new Mesh("paddle", scene);
  vData.applyToMesh(mesh);

  let baseAngle = (baseIndex * Math.PI) / 2;
  mesh.rotationQuaternion = Quaternion.FromEulerAngles(0, baseAngle, 0);

  mesh.material = new StandardMaterial("paddleMat", scene);
  (mesh.material as StandardMaterial).diffuseColor = Color3.Blue();

  let rigidBody = physics.world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setAdditionalMass(0.0)
      .setCcdEnabled(true)
      .setCanSleep(false)
  );

  let colliders: RAPIER.Collider[] = [];
  for (let i = 0; i < PADDLE_QUADS; i++) {
    let vertIndex = i * 2 * 3;
    let points: number[] = [];
    points.push(
      vertices[vertIndex],
      vertices[vertIndex + 2],
      vertices[vertIndex + 3],
      vertices[vertIndex + 5],
      vertices[vertIndex + 6],
      vertices[vertIndex + 8],
      vertices[vertIndex + 9],
      vertices[vertIndex + 11]
    );

    let colliderDesc = RAPIER.ColliderDesc.convexHull(
      Float32Array.from(points)
    );
    if (colliderDesc == null) throw Error("Could not create convex hull!");
    let collider = physics.world.createCollider(
      colliderDesc.setFriction(0).setRestitution(1.0).setDensity(0),
      rigidBody
    );

    colliders.push(collider);
  }

  // Sensor for catch position
  let catchSensor = physics.world.createCollider(
    RAPIER.ColliderDesc.ball(PADDLE_CATCH_SENSOR_RADIUS)
      .setTranslation(paddleCatchPos.x, paddleCatchPos.z)
      .setSensor(true)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
    rigidBody
  );
  colliders.push(catchSensor);
  // Visual for debug
  /*
  let dbgPt = MeshBuilder.CreateSphere(
    "testCatchArea",
    { diameter: PADDLE_CATCH_RADIUS * 2 },
    scene
  );
  dbgPt.setAbsolutePosition(paddleCatchPos);
  dbgPt.setParent(mesh);
  */

  rigidBody.setTranslation({ x: corePos.x, y: corePos.z }, false);
  rigidBody.setRotation(baseAngle, false);

  return { mesh, rigidBody, colliders, catchSensor };
}

/**
 * Helper function to move points inside a circle to sit on radius
 */
function adjustForCircle(
  input: Vector3,
  center: Vector3,
  radius: number
): Vector3 {
  if (Vector3.Distance(input, center) >= radius) return input;

  // Move the point to the circle
  let dir = input.subtract(center).normalize();
  return dir.scale(radius).add(center);
}
