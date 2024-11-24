import "./style.css";
import { Game } from "./game.ts";

const appEl = document.getElementById("app");
if (!appEl) throw Error("app element does not exist!");

// Create a new app an initialize systems
const app = new Game(appEl);
await app.init();
