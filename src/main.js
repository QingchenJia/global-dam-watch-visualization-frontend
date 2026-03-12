import { createApp } from "vue";
import App from "./App.vue";
import "cesium/Build/Cesium/Widgets/widgets.css";
import "./styles/app-container.css";
import "./styles/cesium-viewer.css";
import "./styles/control-panel.css";
import "./styles/agent-chat.css";
import "./styles/stats-panel.css";
import "./styles/timeline-slider.css";

createApp(App).mount("#app");
