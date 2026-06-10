// window_manager.js

console.log("[window_manager] Module loaded");

ros.windows = {
  windows: [],
  zIndex: 100,

  open({ title = "App", content = "", width = 500, height = 350 }) {
    const win = document.createElement("div");
    win.className = "ros-window";
    win.innerHTML = `
      <div class="ros-titlebar">
        <span class="ros-title">${title}</span>
        <div class="ros-controls">
          <button class="min">🗕</button>
          <button class="max">🗖</button>
          <button class="close">✕</button>
        </div>
      </div>
      <div class="ros-content">${content}</div>
      <div class="ros-resizer se"></div>
      <div class="ros-resizer sw"></div>
      <div class="ros-resizer ne"></div>
      <div class="ros-resizer nw"></div>
      <div class="ros-resizer n"></div>
      <div class="ros-resizer s"></div>
      <div class="ros-resizer e"></div>
      <div class="ros-resizer w"></div>
    `;

    Object.assign(win.style, {
      width: `${width}px`,
      height: `${height}px`,
      left: `${100 + this.windows.length * 30}px`,
      top: `${100 + this.windows.length * 30}px`,
      zIndex: this.zIndex++
    });

    document.body.appendChild(win);
    this.windows.push(win);
    requestAnimationFrame(() => win.classList.add("open"));

    // Bring to front on click
    win.addEventListener("mousedown", () => {
      win.style.zIndex = this.zIndex++;
    });

    // Drag logic — fixed: use add/removeEventListener so windows don't stomp each other
    const bar = win.querySelector(".ros-titlebar");
    let isDragging = false, dx = 0, dy = 0;

    const onDragMove = e => {
      if (!isDragging) return;
      win.style.left = `${e.clientX - dx}px`;
      win.style.top  = `${e.clientY - dy}px`;
    };
    const onDragUp = () => {
      isDragging = false;
      document.removeEventListener("mousemove", onDragMove);
      document.removeEventListener("mouseup",   onDragUp);
    };

    bar.addEventListener("mousedown", e => {
      // Don't start drag when clicking control buttons
      if (e.target.closest(".ros-controls")) return;
      isDragging = true;
      dx = e.clientX - win.offsetLeft;
      dy = e.clientY - win.offsetTop;
      document.addEventListener("mousemove", onDragMove);
      document.addEventListener("mouseup",   onDragUp);
    });

    // Resize logic
    win.querySelectorAll(".ros-resizer").forEach(handle => {
      handle.addEventListener("mousedown", e => {
        e.preventDefault();
        const dir       = handle.classList[1];
        const startX    = e.clientX;
        const startY    = e.clientY;
        const startW    = parseInt(getComputedStyle(win).width,  10);
        const startH    = parseInt(getComputedStyle(win).height, 10);
        const startLeft = win.offsetLeft;
        const startTop  = win.offsetTop;

        const onResizeMove = e => {
          if (dir.includes("e")) win.style.width  = `${startW + (e.clientX - startX)}px`;
          if (dir.includes("s")) win.style.height = `${startH + (e.clientY - startY)}px`;
          if (dir.includes("w")) {
            win.style.width = `${startW - (e.clientX - startX)}px`;
            win.style.left  = `${startLeft + (e.clientX - startX)}px`;
          }
          if (dir.includes("n")) {
            win.style.height = `${startH - (e.clientY - startY)}px`;
            win.style.top    = `${startTop + (e.clientY - startY)}px`;
          }
        };
        const onResizeUp = () => {
          document.removeEventListener("mousemove", onResizeMove);
          document.removeEventListener("mouseup",   onResizeUp);
        };

        document.addEventListener("mousemove", onResizeMove);
        document.addEventListener("mouseup",   onResizeUp);
      });
    });

    const [minBtn, maxBtn, closeBtn] = win.querySelectorAll(".ros-controls button");
    let isMaximized = false;
    let prevState   = {};

    minBtn.onclick = () => {
      win.classList.add("minimizing");
      win.addEventListener("animationend", () => {
        win.style.display = "none";
        win.classList.remove("minimizing");
        ros.events?.emit("window:minimized", { title });
      }, { once: true });
    };

    maxBtn.onclick = () => {
      win.classList.add("transitioning");
      if (!isMaximized) {
        prevState = { left: win.style.left, top: win.style.top, width: win.style.width, height: win.style.height };
        Object.assign(win.style, { left: "0px", top: "0px", width: "100vw", height: "100vh" });
        isMaximized = true;
      } else {
        Object.assign(win.style, prevState);
        isMaximized = false;
      }
      win.addEventListener("transitionend", () => win.classList.remove("transitioning"), { once: true });
    };

    closeBtn.onclick = () => {
      win.classList.add("closing");
      win.addEventListener("animationend", () => {
        win.remove();
        this.windows = this.windows.filter(w => w !== win);
      }, { once: true });
    };
  }
};

// Styles
const style = document.createElement("style");
style.textContent = `
.ros-window {
  position: absolute;
  background: #222;
  color: white;
  border-radius: 6px;
  box-shadow: 0 0 12px rgba(0,0,0,0.6);
  overflow: hidden;
  border: 1px solid #444;
  min-width: 200px;
  min-height: 150px;
  display: flex;
  flex-direction: column;
  opacity: 0;
  transform: scale(0.95);
  animation: fadeIn 0.2s ease-out forwards;
}
.ros-window.open        { opacity: 1; transform: scale(1); }
.ros-window.transitioning { transition: all 0.25s ease; }
.ros-window.minimizing  { animation: minimize 0.2s ease-out forwards; }
.ros-window.closing     { animation: fadeOut 0.2s ease-out forwards; }
@keyframes fadeIn   { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
@keyframes fadeOut  { from { opacity:1; transform:scale(1);    } to { opacity:0; transform:scale(0.9); } }
@keyframes minimize { from { opacity:1; transform:scale(1);    } to { opacity:0; transform:scale(0.8) translateY(20px); } }
.ros-titlebar {
  background: #111;
  padding: 0.5em;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
  user-select: none;
}
.ros-titlebar .ros-title { flex: 1; }
.ros-controls button {
  background: transparent;
  border: none;
  color: white;
  font-size: 0.9em;
  cursor: pointer;
  margin-left: 4px;
}
.ros-content { flex: 1; padding: 1em; overflow: auto; }
.ros-resizer { position: absolute; background: transparent; z-index: 10; }
.ros-resizer.n  { top:-2px;    left:0;    right:0;   height:5px;  cursor:n-resize;  }
.ros-resizer.s  { bottom:-2px; left:0;    right:0;   height:5px;  cursor:s-resize;  }
.ros-resizer.e  { top:0;       bottom:0;  right:-2px; width:5px;  cursor:e-resize;  }
.ros-resizer.w  { top:0;       bottom:0;  left:-2px;  width:5px;  cursor:w-resize;  }
.ros-resizer.ne { top:-2px;    right:-2px;  width:10px; height:10px; cursor:ne-resize; }
.ros-resizer.nw { top:-2px;    left:-2px;   width:10px; height:10px; cursor:nw-resize; }
.ros-resizer.se { bottom:-2px; right:-2px;  width:10px; height:10px; cursor:se-resize; }
.ros-resizer.sw { bottom:-2px; left:-2px;   width:10px; height:10px; cursor:sw-resize; }
`;
document.head.appendChild(style);
