/**
 * File System Mount Visualizer — script.js
 * ==========================================
 * Interactive visualization of how an external device's
 * file hierarchy gets mounted into a host file system tree.
 */

// ─────────────────────────────────────────────
//  DATA MODELS
// ─────────────────────────────────────────────

/** Host file system tree structure */
const HOST_FS = {
  id: 'root',
  name: '/',
  type: 'dir',
  icon: '🖥️',
  expanded: true,
  children: [
    {
      id: 'bin', name: 'bin', type: 'dir', icon: '📁', expanded: false,
      children: [
        { id: 'bin-bash',   name: 'bash',   type: 'file', icon: '⚙️',  size: '1.1 MB' },
        { id: 'bin-ls',     name: 'ls',     type: 'file', icon: '⚙️',  size: '148 KB' },
        { id: 'bin-cp',     name: 'cp',     type: 'file', icon: '⚙️',  size: '96 KB'  },
      ]
    },
    {
      id: 'etc', name: 'etc', type: 'dir', icon: '📁', expanded: false,
      children: [
        { id: 'etc-hosts',  name: 'hosts',  type: 'file', icon: '📄', size: '3 KB'   },
        { id: 'etc-fstab',  name: 'fstab',  type: 'file', icon: '📄', size: '1.2 KB' },
        { id: 'etc-passwd', name: 'passwd', type: 'file', icon: '🔐', size: '4 KB'   },
      ]
    },
    {
      id: 'home', name: 'home', type: 'dir', icon: '🏠', expanded: true,
      children: [
        {
          id: 'home-user', name: 'user', type: 'dir', icon: '👤', expanded: false,
          children: [
            { id: 'home-user-docs', name: 'Documents', type: 'dir', icon: '📁', expanded: false, children: [
              { id: 'doc1', name: 'thesis.pdf',    type: 'file', icon: '📑', size: '3.2 MB' },
              { id: 'doc2', name: 'notes.txt',     type: 'file', icon: '📝', size: '14 KB'  },
            ]},
            { id: 'home-user-pics', name: 'Pictures', type: 'dir', icon: '🖼️', expanded: false, children: [
              { id: 'pic1', name: 'vacation.jpg',  type: 'file', icon: '🖼️', size: '4.8 MB' },
            ]},
          ]
        }
      ]
    },
    {
      id: 'mnt', name: 'mnt', type: 'dir', icon: '📂', expanded: true,
      children: [
        {
          id: 'mnt-usb', name: 'usb', type: 'dir', icon: '🔌',
          expanded: true,
          isMountPoint: true,  // ← this is where the device will attach
          children: []         // populated on mount
        }
      ]
    },
    {
      id: 'var', name: 'var', type: 'dir', icon: '📁', expanded: false,
      children: [
        { id: 'var-log',  name: 'log',  type: 'dir',  icon: '📁', expanded: false, children: [
          { id: 'syslog', name: 'syslog', type: 'file', icon: '📋', size: '128 KB' },
        ]},
        { id: 'var-tmp',  name: 'tmp',  type: 'dir',  icon: '📁', expanded: false, children: [] },
      ]
    },
    { id: 'proc', name: 'proc', type: 'dir', icon: '⚡', expanded: false, children: [
      { id: 'proc-1', name: '1', type: 'dir', icon: '📁', expanded: false, children: [] },
      { id: 'proc-cpuinfo', name: 'cpuinfo', type: 'file', icon: '📋', size: '0 B' },
    ]},
  ]
};

/** External USB device file system */
const DEVICE_FS = {
  id: 'usb-root',
  name: 'USB_Drive',
  type: 'dir',
  icon: '💾',
  expanded: true,
  deviceLabel: 'sdb1 · FAT32',
  children: [
    {
      id: 'usb-projects', name: 'Projects', type: 'dir', icon: '💼', expanded: true,
      children: [
        { id: 'usb-proj-web',    name: 'website',      type: 'dir',  icon: '🌐', expanded: false, children: [
          { id: 'usb-index',     name: 'index.html',   type: 'file', icon: '📄', size: '12 KB'  },
          { id: 'usb-styles',    name: 'styles.css',   type: 'file', icon: '🎨', size: '8 KB'   },
          { id: 'usb-script',    name: 'app.js',       type: 'file', icon: '📜', size: '34 KB'  },
        ]},
        { id: 'usb-proj-notes',  name: 'notes.md',     type: 'file', icon: '📝', size: '5 KB'   },
      ]
    },
    {
      id: 'usb-backup', name: 'Backup', type: 'dir', icon: '🗄️', expanded: false,
      children: [
        { id: 'usb-bk1', name: 'config.bak',   type: 'file', icon: '⚙️', size: '2 KB'  },
        { id: 'usb-bk2', name: 'db_dump.sql',  type: 'file', icon: '🗃️', size: '450 KB'},
      ]
    },
    { id: 'usb-readme', name: 'README.txt', type: 'file', icon: '📄', size: '1 KB' },
    { id: 'usb-photo',  name: 'photo.jpg',  type: 'file', icon: '🖼️', size: '2.3 MB' },
  ]
};

// ─────────────────────────────────────────────
//  APPLICATION STATE
// ─────────────────────────────────────────────

const State = {
  isMounted: false,
  isAnimating: false,
  expandedNodes: new Set(['root', 'home', 'mnt', 'mnt-usb', 'home-user', 'usb-root', 'usb-projects']),
};

// ─────────────────────────────────────────────
//  DOM REFERENCES
// ─────────────────────────────────────────────

const DOM = {
  hostTree:      () => document.getElementById('host-tree'),
  deviceTree:    () => document.getElementById('device-tree'),
  mountedSubtree:() => document.getElementById('mounted-subtree'),
  mountBtn:      () => document.getElementById('btn-mount'),
  unmountBtn:    () => document.getElementById('btn-unmount'),
  resetBtn:      () => document.getElementById('btn-reset'),
  statusDot:     () => document.getElementById('status-dot'),
  statusLabel:   () => document.getElementById('status-label'),
  statusMsg:     () => document.getElementById('status-msg'),
  flowBanner:    () => document.getElementById('flow-banner'),
  usbConnector:  () => document.getElementById('usb-connector'),
  connectorLabel:() => document.getElementById('connector-label'),
  svgCanvas:     () => document.getElementById('mount-svg'),
  mountLine:     () => document.getElementById('mount-line'),
  mountDot:      () => document.getElementById('mount-dot'),
  panelDevice:   () => document.getElementById('panel-device'),
  mountPointRow: () => document.getElementById('node-mnt-usb'),
};

// ─────────────────────────────────────────────
//  TREE RENDERING
// ─────────────────────────────────────────────

/**
 * Renders a single tree node (file or directory).
 * @param {Object} node  - The node data
 * @param {number} depth - Nesting depth for indentation
 * @param {Object} opts  - Extra options { delay, isDeviceNode }
 * @returns {HTMLElement}
 */
function renderNode(node, depth = 0, opts = {}) {
  const { delay = 0, isDeviceNode = false } = opts;
  const isDir = node.type === 'dir';
  const isExpanded = State.expandedNodes.has(node.id);
  const hasChildren = isDir && node.children && node.children.length > 0;

  // Wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'tree-node';
  wrapper.id = `node-${node.id}`;
  wrapper.style.animationDelay = `${delay}ms`;

  // Row
  const row = document.createElement('div');
  row.className = 'tree-node-row' + (node.isMountPoint ? ' is-mount-point' : '');
  row.id = `row-${node.id}`;
  row.setAttribute('aria-label', node.name);
  row.setAttribute('role', 'button');
  row.setAttribute('tabindex', '0');

  // Toggle arrow (for dirs)
  const toggle = document.createElement('span');
  toggle.className = 'tree-toggle' + (isExpanded ? ' open' : '');
  toggle.innerHTML = isDir ? '▶' : '';
  row.appendChild(toggle);

  // Icon
  const icon = document.createElement('span');
  icon.className = 'tree-icon';
  icon.textContent = node.icon;
  row.appendChild(icon);

  // Label
  const label = document.createElement('span');
  label.className = 'tree-label' + (isDir ? ' is-dir' : '');
  label.textContent = node.name;
  row.appendChild(label);

  // File size meta
  if (!isDir && node.size) {
    const meta = document.createElement('span');
    meta.className = 'tree-meta';
    meta.textContent = node.size;
    row.appendChild(meta);
  }

  // Mount point badges
  if (node.isMountPoint) {
    const badge = document.createElement('span');
    badge.className = 'mount-badge';
    badge.id = 'badge-mount';
    badge.textContent = 'mount point';
    row.appendChild(badge);

    const mbadge = document.createElement('span');
    mbadge.className = 'mounted-badge';
    mbadge.id = 'badge-mounted';
    mbadge.textContent = '✓ mounted';
    row.appendChild(mbadge);
  }

  wrapper.appendChild(row);

  // Children
  if (isDir) {
    const children = document.createElement('div');
    children.className = 'tree-children' + (isExpanded ? ' expanded' : ' collapsed');
    children.id = `children-${node.id}`;

    // CSS .tree-children.expanded handles max-height via 9999px, no inline override needed

    if (node.children) {
      node.children.forEach((child, i) => {
        const childEl = renderNode(child, depth + 1, {
          delay: delay + i * 30,
          isDeviceNode
        });
        children.appendChild(childEl);
      });
    }

    // Mounted subtree placeholder (only for mount point)
    if (node.isMountPoint) {
      const sub = document.createElement('div');
      sub.id = 'mounted-subtree';
      children.appendChild(sub);
    }

    wrapper.appendChild(children);

    // Toggle expand/collapse on click
    row.addEventListener('click', () => toggleNode(node.id, children, toggle));
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') toggleNode(node.id, children, toggle);
    });
  }

  return wrapper;
}

/** Count all descendants including nested */
function countDescendants(node) {
  if (!node.children) return 0;
  return node.children.reduce((sum, child) => {
    return sum + 1 + countDescendants(child);
  }, 0);
}

/** Toggle expand/collapse a directory node */
function toggleNode(nodeId, childrenEl, toggleEl) {
  if (State.isAnimating) return;
  const isExpanded = State.expandedNodes.has(nodeId);

  if (isExpanded) {
    State.expandedNodes.delete(nodeId);
    childrenEl.classList.remove('expanded');
    childrenEl.classList.add('collapsed');
    childrenEl.style.maxHeight = '0px';
    toggleEl.classList.remove('open');
  } else {
    State.expandedNodes.add(nodeId);
    childrenEl.classList.remove('collapsed');
    childrenEl.classList.add('expanded');
    // max-height is handled by CSS class (.expanded = 9999px, .collapsed = 0)
    toggleEl.classList.add('open');
  }
}

/** Render the full host tree into the container */
function renderHostTree() {
  const container = DOM.hostTree();
  container.innerHTML = '';
  const rootEl = renderNode(HOST_FS);
  container.appendChild(rootEl);
}

/** Render the device tree into the device panel */
function renderDeviceTree() {
  const container = DOM.deviceTree();
  container.innerHTML = '';
  const rootEl = renderNode(DEVICE_FS, 0, { isDeviceNode: true });
  container.appendChild(rootEl);
}

/**
 * Render mounted device subtree inside the host mount point.
 * Uses the same DEVICE_FS data with animation delays.
 */
function renderMountedSubtree() {
  const sub = document.getElementById('mounted-subtree');
  if (!sub) return;

  sub.innerHTML = '';

  // Device label banner
  const lbl = document.createElement('div');
  lbl.className = 'mounted-device-label';
  lbl.innerHTML = `<span>💾</span><span>${DEVICE_FS.deviceLabel || 'External Device'} — mounted</span>`;
  sub.appendChild(lbl);

  // Render device children with staggered animation
  DEVICE_FS.children.forEach((child, i) => {
    const el = renderNode(child, 1, { delay: i * 60, isDeviceNode: true });
    el.classList.add('node-enter');
    el.style.animationDelay = `${i * 60}ms`;
    sub.appendChild(el);
  });
}

// ─────────────────────────────────────────────
//  STATUS BAR HELPERS
// ─────────────────────────────────────────────

function setStatus(state, label, msg) {
  const dot   = DOM.statusDot();
  const lbl   = DOM.statusLabel();
  const msgEl = DOM.statusMsg();

  dot.className = `status-dot ${state}`;
  lbl.textContent = label;
  msgEl.textContent = msg || '';
}

// ─────────────────────────────────────────────
//  SVG MOUNT LINE
// ─────────────────────────────────────────────

/**
 * Draws an animated SVG curve between the device panel
 * and the mount-point row in the host tree.
 */
function drawMountLine() {
  const svg        = DOM.svgCanvas();
  const lineEl     = DOM.mountLine();
  const dotEl      = DOM.mountDot();
  const mountRow   = document.getElementById('row-mnt-usb');
  const devicePanel= DOM.panelDevice();

  if (!mountRow || !devicePanel || !svg) return;

  const mountRect  = mountRow.getBoundingClientRect();
  const deviceRect = devicePanel.getBoundingClientRect();
  const svgRect    = svg.getBoundingClientRect();

  // Source: left edge of device panel (vertical center)
  const x1 = deviceRect.left  - svgRect.left;
  const y1 = deviceRect.top   + deviceRect.height / 2 - svgRect.top;

  // Destination: right edge of mount point row
  const x2 = mountRect.right  - svgRect.left;
  const y2 = mountRect.top    + mountRect.height / 2 - svgRect.top;

  // Cubic bezier: pull control points horizontally
  const cx1 = x1 - (x1 - x2) * 0.45;
  const cy1 = y1;
  const cx2 = x2 + (x1 - x2) * 0.45;
  const cy2 = y2;

  const d = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

  lineEl.setAttribute('d', d);
  dotEl.setAttribute('cx', x1);
  dotEl.setAttribute('cy', y1);

  // Trigger animation
  requestAnimationFrame(() => {
    lineEl.classList.add('drawn');
    setTimeout(() => { dotEl.classList.add('visible'); }, 700);
  });
}

function clearMountLine() {
  const lineEl = DOM.mountLine();
  const dotEl  = DOM.mountDot();
  if (!lineEl) return;
  lineEl.classList.remove('drawn');
  lineEl.classList.add('unmounting');
  dotEl.classList.remove('visible');
  setTimeout(() => { lineEl.classList.remove('unmounting'); }, 600);
}

// ─────────────────────────────────────────────
//  MOUNT / UNMOUNT LOGIC
// ─────────────────────────────────────────────

/**
 * Mount the external device.
 * 1. Disable buttons & update status
 * 2. Animate device panel sliding toward mount point
 * 3. Draw SVG connection line
 * 4. Inject device subtree inside mount point
 * 5. Re-enable buttons & update status
 */
function mountDevice() {
  if (State.isMounted || State.isAnimating) return;
  State.isAnimating = true;

  // Update controls
  setButtonStates({ mount: false, unmount: false, reset: false });
  setStatus('working', 'Mounting...', 'Attaching device filesystem to /mnt/usb');

  // Animate flow banner
  const banner = DOM.flowBanner();
  banner.classList.add('animating');

  // Step 1: Slide device panel
  const devicePanel = DOM.panelDevice();
  devicePanel.classList.add('animate-slide');
  setTimeout(() => { devicePanel.classList.remove('animate-slide'); }, 900);

  // Step 2: Draw SVG line (slight delay for visual layering)
  setTimeout(() => {
    drawMountLine();
  }, 300);

  // Step 3: Mark mount point in host tree
  setTimeout(() => {
    const mountRow = document.getElementById('row-mnt-usb');
    if (mountRow) mountRow.classList.add('device-mounted');

    const mountPointChildren = document.getElementById('children-mnt-usb');
    if (mountPointChildren) {
      // CSS .expanded class sets max-height: 9999px — no inline override needed
      mountPointChildren.classList.remove('collapsed');
      mountPointChildren.classList.add('expanded');
      const toggle = mountRow?.querySelector('.tree-toggle');
      if (toggle) toggle.classList.add('open');
    }
  }, 500);

  // Step 4: Inject mounted subtree
  setTimeout(() => {
    const sub = document.getElementById('mounted-subtree');
    if (sub) {
      renderMountedSubtree();
      // Small rAF delay so browser registers the content before animating in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          sub.classList.add('show-mounted');
        });
      });
    }

    // Dim device panel
    devicePanel.classList.add('is-mounted');

    // Activate connector
    DOM.usbConnector().classList.add('active');
    DOM.connectorLabel().classList.add('active');
    DOM.connectorLabel().textContent = 'Connected';

    State.isMounted = true;
    State.isAnimating = false;

    setStatus('success', 'Mounted', '/dev/sdb1 → /mnt/usb (FAT32, 16 GB)');
    setButtonStates({ mount: false, unmount: true, reset: true });
    banner.classList.remove('animating');
  }, 900);
}

/**
 * Unmount the external device.
 * Reverses the mount animation in a smooth sequence.
 */
function unmountDevice() {
  if (!State.isMounted || State.isAnimating) return;
  State.isAnimating = true;

  setButtonStates({ mount: false, unmount: false, reset: false });
  setStatus('working', 'Unmounting...', 'Detaching /dev/sdb1 from /mnt/usb');

  // Step 1: Clear mount line
  clearMountLine();

  // Step 2: Collapse mounted subtree (CSS transition handles the hide animation)
  setTimeout(() => {
    const sub = document.getElementById('mounted-subtree');
    if (sub) sub.classList.remove('show-mounted');
  }, 100);

  // Step 3: Remove mounted state from mount point
  setTimeout(() => {
    const mountRow = document.getElementById('row-mnt-usb');
    if (mountRow) mountRow.classList.remove('device-mounted');
  }, 500);

  // Step 4: Clear subtree contents after transition completes, restore device panel
  setTimeout(() => {
    const sub = document.getElementById('mounted-subtree');
    if (sub) {
      sub.innerHTML = '';
    }

    const devicePanel = DOM.panelDevice();
    devicePanel.classList.remove('is-mounted');
    devicePanel.classList.add('animate-slide-out');
    setTimeout(() => { devicePanel.classList.remove('animate-slide-out'); }, 500);

    DOM.usbConnector().classList.remove('active');
    DOM.connectorLabel().classList.remove('active');
    DOM.connectorLabel().textContent = 'Disconnected';

    State.isMounted = false;
    State.isAnimating = false;

    setStatus('idle', 'Unmounted', 'Device safely ejected from /mnt/usb');
    setButtonStates({ mount: true, unmount: false, reset: true });
  }, 700);
}

/**
 * Reset everything back to initial state.
 */
function resetVisualization() {
  if (State.isAnimating) return;

  // Force unmount if mounted
  if (State.isMounted) {
    State.isMounted = false;
    clearMountLine();

    const sub = document.getElementById('mounted-subtree');
    if (sub) { sub.classList.remove('show-mounted'); sub.innerHTML = ''; }

    const mountRow = document.getElementById('row-mnt-usb');
    if (mountRow) mountRow.classList.remove('device-mounted');

    const devicePanel = DOM.panelDevice();
    devicePanel.classList.remove('is-mounted');
  }

  // Restore expanded state
  State.expandedNodes = new Set(['root', 'home', 'mnt', 'mnt-usb', 'home-user', 'usb-root', 'usb-projects']);

  // Re-render trees
  renderHostTree();
  renderDeviceTree();

  DOM.usbConnector().classList.remove('active');
  DOM.connectorLabel().classList.remove('active');
  DOM.connectorLabel().textContent = 'Disconnected';

  setStatus('idle', 'Ready', 'Click "Mount Device" to start the visualization');
  setButtonStates({ mount: true, unmount: false, reset: true });
}

// ─────────────────────────────────────────────
//  BUTTON STATE HELPER
// ─────────────────────────────────────────────

function setButtonStates({ mount, unmount, reset }) {
  DOM.mountBtn().disabled   = !mount;
  DOM.unmountBtn().disabled = !unmount;
  DOM.resetBtn().disabled   = !reset;
}

// ─────────────────────────────────────────────
//  SVG RESIZE HANDLER
// ─────────────────────────────────────────────

/** Redraw the SVG line on window resize if mounted */
function handleResize() {
  if (State.isMounted) {
    drawMountLine();
  }
}

// ─────────────────────────────────────────────
//  INITIALISE
// ─────────────────────────────────────────────

function init() {
  // Render both trees
  renderHostTree();
  renderDeviceTree();

  // Set initial state
  setStatus('idle', 'Ready', 'Click "Mount Device" to start the visualization');
  setButtonStates({ mount: true, unmount: false, reset: true });

  // Wire up buttons
  DOM.mountBtn().addEventListener('click',   mountDevice);
  DOM.unmountBtn().addEventListener('click', unmountDevice);
  DOM.resetBtn().addEventListener('click',   resetVisualization);

  // SVG resize
  window.addEventListener('resize', debounce(handleResize, 150));
}

/** Simple debounce utility */
function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Boot when DOM is ready
document.addEventListener('DOMContentLoaded', init);
