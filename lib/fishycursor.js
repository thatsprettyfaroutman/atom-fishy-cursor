"use babel";

import FishycursorView from "./fishycursor-view";
import { CompositeDisposable } from "atom";

// TODO: listen to new editors
// TODO: handle multiple editors
// TODO: show original cursor if toggled off

const FISHY_AREA_CLASSNAME = "fishy-area-555";
const MASS = 1;
const TENSION = 170;
const FRICTION = 26;
const PRECISION = 0.01;
const CLAMP = false;
const VELOCITY = 0;

export default {
  active: false,
  fishycursorView: null,
  modalPanel: null,
  subscriptions: null,
  areas: [],

  activate(state) {
    this.fishycursorView = new FishycursorView(state.fishycursorViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.fishycursorView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(
      atom.commands.add("atom-workspace", {
        "fishycursor:toggle": () => this.toggle()
      })
    );
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.fishycursorView.destroy();
  },

  serialize() {
    return {
      fishycursorViewState: this.fishycursorView.serialize()
    };
  },

  toggle() {
    this.active = !this.active;
    if (this.active) {
      this.activateFishy();
    } else {
      this.destroyFishy();
    }

    // const editor = atom.workspace.getActiveTextEditor();
    // const view = atom.views.getView(editor);
    // const { top, left } = view.pixelPositionForScreenPosition(
    //   editor.getLastCursor().getScreenPosition()
    // );

    // editor.onDidChange(e => {
    //   console.log("woot");
    // });

    // console.dir(view);
    // console.log(view.children[0].children[0].children[0].style.transform);
    // console.log(top, left);

    /*
    const fish = atom.document.createElement("div");
    fish.style.position = "absolute";
    fish.style.top = `${top}px`;
    fish.style.left = `${left}px`;
    fish.style.width = "40px";
    fish.style.height = "40px";
    fish.style.backgroundRepeat = "no-repeat";
    fish.style.backgroundSize = "contain";
    fish.style.backgroundImage = "url(https://i.imgur.com/lY7orqe.gif)";
    */

    // if (this.active) {
    //   div.appendChild(fish);
    // } else {
    // }

    // console.log("Fishycursor was toggled!");
    // return this.modalPanel.isVisible()
    //   ? this.modalPanel.hide()
    //   : this.modalPanel.show();
  },

  activateFishy() {
    const areaContainers = atom.document.body.querySelectorAll(
      "div.scroll-view > div:first-child"
    );

    const areas = [...areaContainers].map(containerEl => {
      const area = atom.document.createElement("div");
      area.className = FISHY_AREA_CLASSNAME;
      area.style.position = "absolute";
      area.style.top = 0;
      area.style.left = 0;
      area.style.width = "100px";
      area.style.height = "100px";
      area.style.pointerEvents = "none";
      area.style.backgroundColor = "rgba(255, 0, 0, 0.2)";
      area.style.zIndex = 999;
      containerEl.appendChild(area);
      return area;
    });

    this.areas = [...this.areas, ...areas];

    const editors = atom.workspace.getTextEditors();
    editors.forEach(this.handleEditor);

    // view.querySelectorAll("div.scroll-view > div")[0].appendChild(div);
  },

  destroyFishy() {
    endFishLoop();
    fishes.forEach(fish => fish.destroy());
    fishes = [];
    this.areas = this.areas.filter(area => {
      area.remove();
      return false;
    });
    const editors = atom.workspace.getTextEditors();
    editors.forEach(editor => {
      const view = atom.views.getView(editor);
      [...view.querySelectorAll(".cursors")].forEach(x => {
        x.style.opacity = "";
      });
    });
  },

  handleEditor(editor) {
    // console.log("handle editor", editor);
    // console.log("current cursors", editor.getCursors());

    console.log(atom);
    startFishLoop();

    const view = atom.views.getView(editor);
    [...view.querySelectorAll(".cursors")].forEach(x => {
      x.style.opacity = 0;
    });

    // editor.fishes = [];
    editor.getCursors().forEach(cursor => {
      // editor.fishes.push(spawnFish(editor, cursor));
      fishes.push(new Fish(editor, cursor));
    });

    editor.onDidAddCursor(cursor => {
      // editor.fishes.push(spawnFish(editor, cursor));
      fishes.push(new Fish(editor, cursor));
    });

    editor.onDidRemoveCursor(cursor => {
      fishes = fishes.filter(fish => {
        if (fish.id !== cursor.id) {
          return true;
        }
        // fish.remove();
        fish.destroy();
        return false;
      });
    });

    editor.onDidChangeCursorPosition(({ cursor, newScreenPosition }) => {
      const fish = fishes.find(fish => fish.id === cursor.id);
      if (!fish) {
        return;
      }
      fish.setPosition(getFishyPosition(editor, newScreenPosition));
    });

    editor.onDidSave(e => {
      console.log("saved!! yay!");
    });
  }
};

// --------------------------------------
// Helpers
// --------------------------------------

const getFishyPosition = (editor, screenPosition) => {
  const view = atom.views.getView(editor);
  const { left, top } = view.pixelPositionForScreenPosition(screenPosition);
  return [left, top];
};

const calculateNextPosition = (from, to, velocity, steps) => {
  for (let i = 0; i < steps; ++i) {
    const force = -TENSION * (from - to);
    const damping = -FRICTION * velocity;
    const acceleration = (force + damping) / MASS;
    velocity = velocity + (acceleration * 1) / 1000;
    from = from + (velocity * 1) / 1000;
  }

  if (Math.abs(velocity) < PRECISION) {
    velocity = 0;
  }

  return [from, velocity];
};

// --------------------------------------
// Fishes and fish loop
// --------------------------------------

let fishes = [];
let fishLoopActive = false;
let lastLoopTime = Date.now();

const startFishLoop = () => {
  if (fishLoopActive) {
    return;
  }
  lastLoopTime = Date.now();
  fishLoopActive = true;
  fishLoop();
};

const endFishLoop = () => {
  fishLoopActive = false;
};

const fishLoop = () => {
  if (!fishLoopActive) {
    return;
  }
  const now = Date.now();
  const delta = now - lastLoopTime;
  lastLoopTime = now;
  fishes.forEach(x => x.update(delta));
  atom.window.requestAnimationFrame(fishLoop);
};

// --------------------------------------
// Fish
// --------------------------------------

class Fish {
  id = null;
  x = 0;
  y = 0;
  targetX = 0;
  targetY = 0;
  velocityX = 0;
  velocityY = 0;
  el = null;
  view = null;
  friction = 0.98;

  constructor(editor, cursor) {
    const [x, y] = getFishyPosition(editor, cursor.getScreenPosition());
    this.id = cursor.id;
    this.x = this.targetX = x;
    this.y = this.targetY = y;
    this.view = atom.views.getView(editor);

    this.el = atom.document.createElement("div");
    this.el.style.position = "absolute";
    this.el.style.top = 0;
    this.el.style.left = 0;
    this.el.style.width = "40px";
    this.el.style.height = "40px";
    this.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    this.el.style.backgroundRepeat = "no-repeat";
    this.el.style.backgroundSize = "contain";
    this.el.style.backgroundImage = "url(https://i.imgur.com/lY7orqe.gif)";
    this.view
      .querySelectorAll(`.${FISHY_AREA_CLASSNAME}`)[0]
      .appendChild(this.el);
  }

  setPosition = ([x, y]) => {
    this.targetX = x;
    this.targetY = y;
  };

  destroy = () => {
    this.id = null;
    this.x = 0;
    this.y = 0;
    this.view = null;
    this.el.remove();
    this.el = null;
  };

  update = delta => {
    const [nextX, nextVelocityX] = calculateNextPosition(
      this.x,
      this.targetX,
      this.velocityX,
      delta
    );
    this.x = nextX;
    this.velocityX = nextVelocityX;

    const [nextY, nextVelocityY] = calculateNextPosition(
      this.y,
      this.targetY,
      this.velocityY,
      delta
    );
    this.y = nextY;
    this.velocityY = nextVelocityY;

    this.updatePosition();
  };

  updatePosition = () => {
    this.el.style.transform = [
      `translate3d(${this.x}px, ${this.y}px, 0)`,
      `scale3d(${this.velocityX < 0 ? -1 : 1}, 1, 1)`
    ].join(" ");
  };
}
