import { createApp } from "vue";
import App from "./App.vue";
import "cesium/Build/Cesium/Widgets/widgets.css";
import "./assets/styles/app-container.css";
import "./assets/styles/cesium-viewer.css";
import "./assets/styles/control-panel.css";
import "./assets/styles/agent-chat.css";
import "./assets/styles/stats-panel.css";
import "./assets/styles/timeline-slider.css";
import "./assets/styles/bookmark-panel.css";
import "./assets/styles/entity-description.css";
import "./assets/styles/position-information.css";

createApp(App).mount("#app");
