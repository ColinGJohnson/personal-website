import './assets/styles.css';

import {buildRenderer} from "./Renderer";

(async () => {
  const renderer = await buildRenderer("webgpu-canvas");
  renderer.animate();
})();
