import { AdvancedDynamicTexture, Button, Control } from '@babylonjs/gui';
import {
  DirectionalLight,
  Engine,
  MeshBuilder,
  Scene,
  Vector3,
  WebXRDefaultExperience,
} from '@babylonjs/core';
import {
  convertTextureToImageDataAsync,
  createCameraTexture,
  getCameraIntrinsics,
} from './XRCameraDataUtils';
import { IPngEncoder } from './IPngEncoder';
import { CameraIntrinsics } from './CameraIntrinsics';

export default class BabylonApp {
  private engine: Engine;

  private scene: Scene;

  private xr?: WebXRDefaultExperience;

  private pngEncoder: IPngEncoder;

  public constructor(renderCanvas: HTMLCanvasElement, encoder: IPngEncoder) {
    this.engine = new Engine(renderCanvas, true);
    this.scene = new Scene(this.engine);

    this.pngEncoder = encoder;
  }

  public RunAsync = async () => {
    const webxrTask = this.scene.createDefaultXRExperienceAsync({
      uiOptions: {
        sessionMode: 'immersive-ar',
        referenceSpaceType: 'unbounded',
        optionalFeatures: ['camera-access'],
      },
    });

    this.InitScene();

    this.xr = await webxrTask;

    this.xr.baseExperience.onStateChangedObservable.add(() => {
      this.InitGUI();
    });

    this.engine.runRenderLoop(() => {
      this.scene.render();
    });

    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  };

  private InitScene = () => {
    this.scene.createDefaultCamera(true, true, true);

    new DirectionalLight('light', new Vector3(0.4, -1, 0.6), this.scene);

    const box = MeshBuilder.CreateBox('box', { size: 0.2 }, this.scene);
    box.position = new Vector3(0, 0.1, 0);
  };

  private InitGUI = () => {
    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI('UI');

    const button = Button.CreateSimpleButton('button', 'button');
    button.widthInPixels = 800;
    button.heightInPixels = 150;
    button.color = 'white';
    button.cornerRadius = 20;
    button.background = 'green';
    button.fontSizeInPixels = 50;
    button.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    button.topInPixels = -10;
    advancedTexture.addControl(button);
    return { button };
  };

  private CreateCameraIntrinsicsFromFrame = (
    frame: XRFrame
  ): CameraIntrinsics | null => {
    if (!this.xr) {
      return null;
    }

    const referenceSpace = this.xr.baseExperience.sessionManager.referenceSpace;

    const viewerPose = frame.getViewerPose(referenceSpace);
    if (!viewerPose) {
      return null;
    }

    const view = viewerPose.views[0];
    if (!view) {
      return null;
    }

    const viewport: XRViewport = {
      x: 0,
      y: 0,
      width: (view as any).camera.width,
      height: (view as any).camera.height,
    };

    const projectionMatrix = view.projectionMatrix;

    const intrinsics = getCameraIntrinsics(projectionMatrix, viewport);

    return intrinsics;
  };

  private CreateCameraImageBase64StringFromFrameAsync = async (
    frame: XRFrame
  ): Promise<string | null> => {
    if (!this.xr) {
      return null;
    }

    const refernceSpace = this.xr.baseExperience.sessionManager.referenceSpace;

    const texture = createCameraTexture(this.engine, refernceSpace, frame);

    if (texture === null) {
      return null;
    }
    const imageData = await convertTextureToImageDataAsync(texture);

    if (imageData === null) {
      return null;
    }

    const b64Image = this.pngEncoder.encodeBase64(imageData);

    return b64Image;
  };
}
