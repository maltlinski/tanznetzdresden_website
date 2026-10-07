/* @ds-bundle: {"format":4,"namespace":"TanzNetzDresdenDesignSystem_cacd0a","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Logo","sourcePath":"components/core/Logo.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Card","sourcePath":"components/layout/Card.jsx"},{"name":"KeilBar","sourcePath":"components/layout/KeilBar.jsx"},{"name":"PageBand","sourcePath":"components/layout/PageBand.jsx"}],"sourceHashes":{"assets/tndd-logo.js":"d4fd5602d473","components/core/Badge.jsx":"fab98f914d9b","components/core/Button.jsx":"bafa27094706","components/core/Logo.jsx":"1b8b4796b4a9","components/core/Tag.jsx":"4c11db210c39","components/forms/Checkbox.jsx":"53ef44b76f34","components/forms/Input.jsx":"fd2a33d0831c","components/forms/Switch.jsx":"232f60f36757","components/layout/Card.jsx":"086ca752dbc8","components/layout/KeilBar.jsx":"d4e57191a573","components/layout/PageBand.jsx":"74b773c8fcaf","ui_kits/social/Board.jsx":"674a35fe7315","ui_kits/social/SocialApp.jsx":"3ee2932d7031","ui_kits/social/Square.jsx":"feea5118e23b","ui_kits/social/Story.jsx":"251a1c864b0e","ui_kits/website/Footer.jsx":"abe60ee3b830","ui_kits/website/Formats.jsx":"c8d6aa40d510","ui_kits/website/Header.jsx":"be88069f2829","ui_kits/website/Hero.jsx":"6644f5fbeb04","ui_kits/website/Programme.jsx":"465e1b298bd7","ui_kits/website/SiteApp.jsx":"d41d7298a881"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.TanzNetzDresdenDesignSystem_cacd0a = window.TanzNetzDresdenDesignSystem_cacd0a || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// assets/tndd-logo.js
try { (() => {
// tndd-logo.js — inline the TNDD logo so it recolors via CSS `color` (currentColor).
// Usage: <span class="tndd-logo" data-part="full"></span> then this script auto-fills.
// part: full | mark | word. The SVG inherits the element's color.
(function () {
  var SVG = {
    full: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1100 572.94\" fill=\"currentColor\">\n<polygon points=\"52.85,53.829 323.489,53.829 323.489,121.821 224.708,121.821 224.708,329.18 139.624,329.18 139.624,121.821 52.85,121.821 \"></polygon>\n<polygon points=\"245.56,142.811 325.009,142.811 428.688,295.151 428.688,142.811 508.89,142.811 508.89,418.163 428.688,418.163 325.572,266.977 325.572,418.163 245.56,418.163 \"></polygon>\n<path d=\"M529.741,142.811h126.404c24.916,0,45.051,3.382,60.389,10.143c15.338,6.762,28.016,16.469,38.035,29.113c10.018,12.648,17.279,27.361,21.787,44.139c4.51,16.781,6.764,34.561,6.764,53.342c0,29.428-3.354,52.25-10.049,68.463c-6.701,16.217-15.998,29.804-27.893,40.758c-11.9,10.957-24.67,18.253-38.316,21.881c-18.66,5.01-35.568,7.514-50.717,7.514H529.741V142.811z M614.824,205.168v150.448h20.849c17.777,0,30.428-1.971,37.941-5.917c7.514-3.943,13.398-10.828,17.656-20.658c4.256-9.828,6.389-25.764,6.389-47.804c0-29.173-4.762-49.144-14.277-59.915c-9.518-10.768-25.296-16.154-47.331-16.154H614.824z\"></path>\n<path d=\"M1047.15,417.797H922.581c-24.554,0-44.393-3.331-59.51-9.994c-15.115-6.665-27.608-16.229-37.484-28.691c-9.87-12.464-17.028-26.964-21.47-43.498c-4.442-16.539-6.665-34.057-6.665-52.568c0-29,3.305-51.489,9.904-67.469c6.603-15.981,15.765-29.369,27.487-40.166c11.726-10.799,24.312-17.986,37.761-21.563c18.387-4.938,35.049-7.403,49.977-7.403h124.569V417.797z M963.303,356.345V208.081h-20.547c-17.52,0-29.986,1.943-37.39,5.83c-7.403,3.888-13.203,10.672-17.399,20.362c-4.192,9.685-6.295,25.386-6.295,47.107c0,28.751,4.693,48.433,14.068,59.047c9.38,10.61,24.928,15.918,46.646,15.918H963.303z\"></path>\n<path d=\"M139.532,451.622h54.355v15.817h-18.214v50.521H157.65v-50.521h-18.118V451.622z\"></path>\n<path d=\"M231.141,505.305h-22.433l-3.931,12.655h-17.64l22.337-66.339h21.762l22.337,66.339h-18.406L231.141,505.305z M213.31,490.735h13.325l-4.506-14.285c-1.246-3.834-1.917-7.765-1.917-7.765h-0.384c0,0-0.767,3.931-2.013,7.765L213.31,490.735z\"></path>\n<path d=\"M293.702,517.96l-14.188-30.869c-2.013-4.41-5.368-13.805-5.368-13.805h-0.384c0,0,0.767,9.3,0.767,15.243v29.431h-16.585v-66.339h23.008l14.188,30.869c2.014,4.408,5.752,13.804,5.752,13.804h0.384c0,0-1.055-9.298-1.055-15.242v-29.431h16.489v66.339H293.702z\"></path>\n<path d=\"M324.053,507.607l27.801-40.36h-26.842v-15.625h50.138v11.313l-26.938,39.4h27.801v15.626h-51.959V507.607z\"></path>\n<path d=\"M419.324,517.96l-14.188-30.869c-2.013-4.41-5.368-13.805-5.368-13.805h-0.384c0,0,0.768,9.3,0.768,15.243v29.431h-16.586v-66.339h23.009l14.188,30.869c2.013,4.408,5.751,13.804,5.751,13.804h0.384c0,0-1.055-9.298-1.055-15.242v-29.431h16.489v66.339H419.324z\"></path>\n<path d=\"M452.79,451.622h47.358v15.051H470.43v10.354h27.801v14.668H470.43v11.215h30.485v15.052H452.79V451.622z\"></path>\n<path d=\"M503.943,451.622H558.3v15.817h-18.215v50.521h-18.023v-50.521h-18.118V451.622z\"></path>\n<path d=\"M561.279,507.607l27.802-40.36h-26.842v-15.625h50.138v11.313l-26.938,39.4h27.801v15.626h-51.96V507.607z\"></path>\n<path d=\"M647.444,451.622c19.173,0,32.594,12.462,32.594,32.979c0,20.515-13.421,33.36-32.594,33.36h-26.651v-66.339H647.444z M648.786,466.864h-10.162v35.854h10.162c9.396,0,13.038-8.914,13.038-18.117C661.824,475.492,658.182,466.864,648.786,466.864z\"></path>\n<path d=\"M687.179,451.622h30.198c15.243,0,25.021,7.189,25.021,20.994c0,9.012-4.984,15.339-11.983,18.598l13.039,26.747h-18.79l-11.6-24.157h-8.245v24.157h-17.64V451.622z M716.802,466.096h-11.983v13.422h11.983c5.368,0,7.861-3.068,7.861-6.902S722.17,466.096,716.802,466.096z\"></path>\n<path d=\"M749.854,451.622h47.358v15.051h-29.719v10.354h27.802v14.668h-27.802v11.215h30.485v15.052h-48.125V451.622z\"></path>\n<path d=\"M804.315,471.083c0-11.121,9.395-20.611,25.309-20.611c11.983,0,23.008,5.943,28.664,14.476l-15.339,9.778c-1.534-6.231-7.382-9.971-13.997-9.971c-4.409,0-7.285,2.014-7.285,4.794c0,4.218,7.095,5.081,15.914,7.669c10.928,3.164,21.09,7.67,21.09,20.323c0,12.271-10.641,21.57-26.267,21.57c-13.422,0-24.829-6.327-31.062-17.16l15.818-10.065c2.492,7.764,8.148,12.941,16.01,12.941c5.464,0,8.148-2.588,8.148-5.848c0-5.465-9.107-6.135-18.693-9.012C811.889,486.899,804.315,482.202,804.315,471.083z\"></path>\n<path d=\"M891.975,451.622c19.173,0,32.595,12.462,32.595,32.979c0,20.515-13.422,33.36-32.595,33.36h-26.65v-66.339H891.975z M893.317,466.864h-10.162v35.854h10.162c9.395,0,13.037-8.914,13.037-18.117C906.354,475.492,902.712,466.864,893.317,466.864z\"></path>\n<path d=\"M931.71,451.622h47.357v15.051h-29.719v10.354h27.802v14.668h-27.802v11.215h30.485v15.052H931.71V451.622z\"></path>\n<path d=\"M1024.143,517.96l-14.188-30.869c-2.014-4.41-5.369-13.805-5.369-13.805h-0.384c0,0,0.767,9.3,0.767,15.243v29.431h-16.584v-66.339h23.008l14.188,30.869c2.013,4.408,5.752,13.804,5.752,13.804h0.384c0,0-1.056-9.298-1.056-15.242v-29.431h16.489v66.339H1024.143z\"></path>\n</svg>",
    mark: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"45 48 1010 378\" fill=\"currentColor\">\n<polygon points=\"52.85,53.829 323.489,53.829 323.489,121.821 224.708,121.821 224.708,329.18 139.624,329.18 139.624,121.821 52.85,121.821 \"></polygon>\n<polygon points=\"245.56,142.811 325.009,142.811 428.688,295.151 428.688,142.811 508.89,142.811 508.89,418.163 428.688,418.163 325.572,266.977 325.572,418.163 245.56,418.163 \"></polygon>\n<path d=\"M529.741,142.811h126.404c24.916,0,45.051,3.382,60.389,10.143c15.338,6.762,28.016,16.469,38.035,29.113c10.018,12.648,17.279,27.361,21.787,44.139c4.51,16.781,6.764,34.561,6.764,53.342c0,29.428-3.354,52.25-10.049,68.463c-6.701,16.217-15.998,29.804-27.893,40.758c-11.9,10.957-24.67,18.253-38.316,21.881c-18.66,5.01-35.568,7.514-50.717,7.514H529.741V142.811z M614.824,205.168v150.448h20.849c17.777,0,30.428-1.971,37.941-5.917c7.514-3.943,13.398-10.828,17.656-20.658c4.256-9.828,6.389-25.764,6.389-47.804c0-29.173-4.762-49.144-14.277-59.915c-9.518-10.768-25.296-16.154-47.331-16.154H614.824z\"></path>\n<path d=\"M1047.15,417.797H922.581c-24.554,0-44.393-3.331-59.51-9.994c-15.115-6.665-27.608-16.229-37.484-28.691c-9.87-12.464-17.028-26.964-21.47-43.498c-4.442-16.539-6.665-34.057-6.665-52.568c0-29,3.305-51.489,9.904-67.469c6.603-15.981,15.765-29.369,27.487-40.166c11.726-10.799,24.312-17.986,37.761-21.563c18.387-4.938,35.049-7.403,49.977-7.403h124.569V417.797z M963.303,356.345V208.081h-20.547c-17.52,0-29.986,1.943-37.39,5.83c-7.403,3.888-13.203,10.672-17.399,20.362c-4.192,9.685-6.295,25.386-6.295,47.107c0,28.751,4.693,48.433,14.068,59.047c9.38,10.61,24.928,15.918,46.646,15.918H963.303z\"></path>\n</svg>",
    word: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"130 445 920 80\" fill=\"currentColor\">\n<path d=\"M139.532,451.622h54.355v15.817h-18.214v50.521H157.65v-50.521h-18.118V451.622z\"></path>\n<path d=\"M231.141,505.305h-22.433l-3.931,12.655h-17.64l22.337-66.339h21.762l22.337,66.339h-18.406L231.141,505.305z M213.31,490.735h13.325l-4.506-14.285c-1.246-3.834-1.917-7.765-1.917-7.765h-0.384c0,0-0.767,3.931-2.013,7.765L213.31,490.735z\"></path>\n<path d=\"M293.702,517.96l-14.188-30.869c-2.013-4.41-5.368-13.805-5.368-13.805h-0.384c0,0,0.767,9.3,0.767,15.243v29.431h-16.585v-66.339h23.008l14.188,30.869c2.014,4.408,5.752,13.804,5.752,13.804h0.384c0,0-1.055-9.298-1.055-15.242v-29.431h16.489v66.339H293.702z\"></path>\n<path d=\"M324.053,507.607l27.801-40.36h-26.842v-15.625h50.138v11.313l-26.938,39.4h27.801v15.626h-51.959V507.607z\"></path>\n<path d=\"M419.324,517.96l-14.188-30.869c-2.013-4.41-5.368-13.805-5.368-13.805h-0.384c0,0,0.768,9.3,0.768,15.243v29.431h-16.586v-66.339h23.009l14.188,30.869c2.013,4.408,5.751,13.804,5.751,13.804h0.384c0,0-1.055-9.298-1.055-15.242v-29.431h16.489v66.339H419.324z\"></path>\n<path d=\"M452.79,451.622h47.358v15.051H470.43v10.354h27.801v14.668H470.43v11.215h30.485v15.052H452.79V451.622z\"></path>\n<path d=\"M503.943,451.622H558.3v15.817h-18.215v50.521h-18.023v-50.521h-18.118V451.622z\"></path>\n<path d=\"M561.279,507.607l27.802-40.36h-26.842v-15.625h50.138v11.313l-26.938,39.4h27.801v15.626h-51.96V507.607z\"></path>\n<path d=\"M647.444,451.622c19.173,0,32.594,12.462,32.594,32.979c0,20.515-13.421,33.36-32.594,33.36h-26.651v-66.339H647.444z M648.786,466.864h-10.162v35.854h10.162c9.396,0,13.038-8.914,13.038-18.117C661.824,475.492,658.182,466.864,648.786,466.864z\"></path>\n<path d=\"M687.179,451.622h30.198c15.243,0,25.021,7.189,25.021,20.994c0,9.012-4.984,15.339-11.983,18.598l13.039,26.747h-18.79l-11.6-24.157h-8.245v24.157h-17.64V451.622z M716.802,466.096h-11.983v13.422h11.983c5.368,0,7.861-3.068,7.861-6.902S722.17,466.096,716.802,466.096z\"></path>\n<path d=\"M749.854,451.622h47.358v15.051h-29.719v10.354h27.802v14.668h-27.802v11.215h30.485v15.052h-48.125V451.622z\"></path>\n<path d=\"M804.315,471.083c0-11.121,9.395-20.611,25.309-20.611c11.983,0,23.008,5.943,28.664,14.476l-15.339,9.778c-1.534-6.231-7.382-9.971-13.997-9.971c-4.409,0-7.285,2.014-7.285,4.794c0,4.218,7.095,5.081,15.914,7.669c10.928,3.164,21.09,7.67,21.09,20.323c0,12.271-10.641,21.57-26.267,21.57c-13.422,0-24.829-6.327-31.062-17.16l15.818-10.065c2.492,7.764,8.148,12.941,16.01,12.941c5.464,0,8.148-2.588,8.148-5.848c0-5.465-9.107-6.135-18.693-9.012C811.889,486.899,804.315,482.202,804.315,471.083z\"></path>\n<path d=\"M891.975,451.622c19.173,0,32.595,12.462,32.595,32.979c0,20.515-13.422,33.36-32.595,33.36h-26.65v-66.339H891.975z M893.317,466.864h-10.162v35.854h10.162c9.395,0,13.037-8.914,13.037-18.117C906.354,475.492,902.712,466.864,893.317,466.864z\"></path>\n<path d=\"M931.71,451.622h47.357v15.051h-29.719v10.354h27.802v14.668h-27.802v11.215h30.485v15.052H931.71V451.622z\"></path>\n<path d=\"M1024.143,517.96l-14.188-30.869c-2.014-4.41-5.369-13.805-5.369-13.805h-0.384c0,0,0.767,9.3,0.767,15.243v29.431h-16.584v-66.339h23.008l14.188,30.869c2.013,4.408,5.752,13.804,5.752,13.804h0.384c0,0-1.056-9.298-1.056-15.242v-29.431h16.489v66.339H1024.143z\"></path>\n</svg>"
  };
  function fill(root) {
    (root || document).querySelectorAll('.tndd-logo').forEach(function (el) {
      if (el.dataset.filled) return;
      var part = el.dataset.part || 'full';
      el.innerHTML = SVG[part] || SVG.full;
      var svg = el.firstElementChild;
      if (svg) {
        svg.style.display = 'block';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.removeAttribute('fill');
        svg.style.fill = 'currentColor';
      }
      el.dataset.filled = '1';
    });
  }
  window.TNDD_LOGO = {
    svg: SVG,
    fill: fill
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () {
    fill();
  });else fill();
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "assets/tndd-logo.js", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * TNDD Badge — a sharp number/label chip. The CI's page-number style:
 * Magenta field, white display lettering. Also used for counters & year tags.
 */
function Badge({
  children,
  variant = 'magenta',
  size = 'md',
  style = {},
  ...rest
}) {
  const palettes = {
    magenta: {
      bg: 'var(--magenta)',
      color: '#fff'
    },
    purple: {
      bg: 'var(--purple)',
      color: '#fff'
    },
    cyan: {
      bg: 'var(--cyan)',
      color: 'var(--purple)'
    },
    outline: {
      bg: 'transparent',
      color: 'var(--magenta)',
      border: '1.5px solid var(--magenta)'
    }
  };
  const sizes = {
    sm: {
      padding: '2px 7px',
      fontSize: 11
    },
    md: {
      padding: '4px 10px',
      fontSize: 13
    },
    lg: {
      padding: '6px 14px',
      fontSize: 16
    }
  };
  const p = palettes[variant] || palettes.magenta;
  const s = sizes[size] || sizes.md;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      letterSpacing: '0.04em',
      lineHeight: 1.05,
      borderRadius: 0,
      background: p.bg,
      color: p.color,
      border: p.border || 'none',
      padding: s.padding,
      fontSize: s.fontSize,
      fontVariantNumeric: 'tabular-nums',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * TNDD Button — sharp-cornered, uppercase, decisive.
 * Primary anchors in Purple and shifts to Magenta on hover (color, not lift).
 * Press nudges down 1px. No rounding, no shadow.
 */
function Button({
  children,
  variant = 'primary',
  size = 'md',
  marker = false,
  disabled = false,
  type = 'button',
  onClick,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const sizes = {
    sm: {
      padding: '9px 16px',
      fontSize: 11
    },
    md: {
      padding: '13px 22px',
      fontSize: 12
    },
    lg: {
      padding: '16px 28px',
      fontSize: 13
    }
  };
  const palettes = {
    primary: {
      bg: hover ? 'var(--magenta)' : 'var(--purple)',
      color: '#fff',
      border: '1.5px solid transparent'
    },
    secondary: {
      bg: hover ? 'var(--cyan-2)' : 'var(--cyan)',
      color: 'var(--purple)',
      border: '1.5px solid transparent'
    },
    ghost: {
      bg: 'transparent',
      color: hover ? 'var(--magenta)' : 'var(--purple)',
      border: `1.5px solid ${hover ? 'var(--magenta)' : 'var(--purple)'}`
    }
  };
  const p = palettes[variant] || palettes.primary;
  const s = sizes[size] || sizes.md;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 9,
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      lineHeight: 1,
      cursor: disabled ? 'not-allowed' : 'pointer',
      borderRadius: 0,
      background: p.bg,
      color: p.color,
      border: p.border,
      padding: s.padding,
      fontSize: s.fontSize,
      opacity: disabled ? 0.45 : 1,
      transform: press && !disabled ? 'translateY(1px)' : 'none',
      transition: 'background var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out), transform var(--dur-fast)',
      ...style
    }
  }, rest), marker && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      background: 'currentColor',
      flex: '0 0 auto'
    }
  }), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Logo.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Path data extracted from assets/tndd-logo.svg (mark) and tndd-word.svg (wordmark).
const MARK = "<polygon points=\"52.85,53.829 323.489,53.829 323.489,121.821 224.708,121.821 224.708,329.18 139.624,329.18 139.624,121.821 52.85,121.821 \"></polygon>\n<polygon points=\"245.56,142.811 325.009,142.811 428.688,295.151 428.688,142.811 508.89,142.811 508.89,418.163 428.688,418.163 325.572,266.977 325.572,418.163 245.56,418.163 \"></polygon>\n<path d=\"M529.741,142.811h126.404c24.916,0,45.051,3.382,60.389,10.143c15.338,6.762,28.016,16.469,38.035,29.113c10.018,12.648,17.279,27.361,21.787,44.139c4.51,16.781,6.764,34.561,6.764,53.342c0,29.428-3.354,52.25-10.049,68.463c-6.701,16.217-15.998,29.804-27.893,40.758c-11.9,10.957-24.67,18.253-38.316,21.881c-18.66,5.01-35.568,7.514-50.717,7.514H529.741V142.811z M614.824,205.168v150.448h20.849c17.777,0,30.428-1.971,37.941-5.917c7.514-3.943,13.398-10.828,17.656-20.658c4.256-9.828,6.389-25.764,6.389-47.804c0-29.173-4.762-49.144-14.277-59.915c-9.518-10.768-25.296-16.154-47.331-16.154H614.824z\"></path>\n<path d=\"M1047.15,417.797H922.581c-24.554,0-44.393-3.331-59.51-9.994c-15.115-6.665-27.608-16.229-37.484-28.691c-9.87-12.464-17.028-26.964-21.47-43.498c-4.442-16.539-6.665-34.057-6.665-52.568c0-29,3.305-51.489,9.904-67.469c6.603-15.981,15.765-29.369,27.487-40.166c11.726-10.799,24.312-17.986,37.761-21.563c18.387-4.938,35.049-7.403,49.977-7.403h124.569V417.797z M963.303,356.345V208.081h-20.547c-17.52,0-29.986,1.943-37.39,5.83c-7.403,3.888-13.203,10.672-17.399,20.362c-4.192,9.685-6.295,25.386-6.295,47.107c0,28.751,4.693,48.433,14.068,59.047c9.38,10.61,24.928,15.918,46.646,15.918H963.303z\"></path>";
const WORD = "<path d=\"M139.532,451.622h54.355v15.817h-18.214v50.521H157.65v-50.521h-18.118V451.622z\"></path>\n<path d=\"M231.141,505.305h-22.433l-3.931,12.655h-17.64l22.337-66.339h21.762l22.337,66.339h-18.406L231.141,505.305z M213.31,490.735h13.325l-4.506-14.285c-1.246-3.834-1.917-7.765-1.917-7.765h-0.384c0,0-0.767,3.931-2.013,7.765L213.31,490.735z\"></path>\n<path d=\"M293.702,517.96l-14.188-30.869c-2.013-4.41-5.368-13.805-5.368-13.805h-0.384c0,0,0.767,9.3,0.767,15.243v29.431h-16.585v-66.339h23.008l14.188,30.869c2.014,4.408,5.752,13.804,5.752,13.804h0.384c0,0-1.055-9.298-1.055-15.242v-29.431h16.489v66.339H293.702z\"></path>\n<path d=\"M324.053,507.607l27.801-40.36h-26.842v-15.625h50.138v11.313l-26.938,39.4h27.801v15.626h-51.959V507.607z\"></path>\n<path d=\"M419.324,517.96l-14.188-30.869c-2.013-4.41-5.368-13.805-5.368-13.805h-0.384c0,0,0.768,9.3,0.768,15.243v29.431h-16.586v-66.339h23.009l14.188,30.869c2.013,4.408,5.751,13.804,5.751,13.804h0.384c0,0-1.055-9.298-1.055-15.242v-29.431h16.489v66.339H419.324z\"></path>\n<path d=\"M452.79,451.622h47.358v15.051H470.43v10.354h27.801v14.668H470.43v11.215h30.485v15.052H452.79V451.622z\"></path>\n<path d=\"M503.943,451.622H558.3v15.817h-18.215v50.521h-18.023v-50.521h-18.118V451.622z\"></path>\n<path d=\"M561.279,507.607l27.802-40.36h-26.842v-15.625h50.138v11.313l-26.938,39.4h27.801v15.626h-51.96V507.607z\"></path>\n<path d=\"M647.444,451.622c19.173,0,32.594,12.462,32.594,32.979c0,20.515-13.421,33.36-32.594,33.36h-26.651v-66.339H647.444z M648.786,466.864h-10.162v35.854h10.162c9.396,0,13.038-8.914,13.038-18.117C661.824,475.492,658.182,466.864,648.786,466.864z\"></path>\n<path d=\"M687.179,451.622h30.198c15.243,0,25.021,7.189,25.021,20.994c0,9.012-4.984,15.339-11.983,18.598l13.039,26.747h-18.79l-11.6-24.157h-8.245v24.157h-17.64V451.622z M716.802,466.096h-11.983v13.422h11.983c5.368,0,7.861-3.068,7.861-6.902S722.17,466.096,716.802,466.096z\"></path>\n<path d=\"M749.854,451.622h47.358v15.051h-29.719v10.354h27.802v14.668h-27.802v11.215h30.485v15.052h-48.125V451.622z\"></path>\n<path d=\"M804.315,471.083c0-11.121,9.395-20.611,25.309-20.611c11.983,0,23.008,5.943,28.664,14.476l-15.339,9.778c-1.534-6.231-7.382-9.971-13.997-9.971c-4.409,0-7.285,2.014-7.285,4.794c0,4.218,7.095,5.081,15.914,7.669c10.928,3.164,21.09,7.67,21.09,20.323c0,12.271-10.641,21.57-26.267,21.57c-13.422,0-24.829-6.327-31.062-17.16l15.818-10.065c2.492,7.764,8.148,12.941,16.01,12.941c5.464,0,8.148-2.588,8.148-5.848c0-5.465-9.107-6.135-18.693-9.012C811.889,486.899,804.315,482.202,804.315,471.083z\"></path>\n<path d=\"M891.975,451.622c19.173,0,32.595,12.462,32.595,32.979c0,20.515-13.422,33.36-32.595,33.36h-26.65v-66.339H891.975z M893.317,466.864h-10.162v35.854h10.162c9.395,0,13.037-8.914,13.037-18.117C906.354,475.492,902.712,466.864,893.317,466.864z\"></path>\n<path d=\"M931.71,451.622h47.357v15.051h-29.719v10.354h27.802v14.668h-27.802v11.215h30.485v15.052H931.71V451.622z\"></path>\n<path d=\"M1024.143,517.96l-14.188-30.869c-2.014-4.41-5.369-13.805-5.369-13.805h-0.384c0,0,0.767,9.3,0.767,15.243v29.431h-16.584v-66.339h23.008l14.188,30.869c2.013,4.408,5.752,13.804,5.752,13.804h0.384c0,0-1.056-9.298-1.056-15.242v-29.431h16.489v66.339H1024.143z\"></path>";

/**
 * TNDD Logo — block-mark + wordmark as one locked vector unit.
 * Recolors via the `color` prop (SVG fill). part: 'full' | 'mark' | 'word'.
 * Never rotate, distort, add effects, or set on a large Magenta field.
 */
function Logo({
  part = 'full',
  color = 'var(--purple)',
  width,
  style = {},
  ...rest
}) {
  let viewBox = '0 0 1100 572.94';
  let inner = MARK + WORD;
  let ratio = 1100 / 572.94;
  if (part === 'mark') {
    viewBox = '45 48 1010 378';
    inner = MARK;
    ratio = 1010 / 378;
  } else if (part === 'word') {
    viewBox = '130 445 920 80';
    inner = WORD;
    ratio = 920 / 80;
  }
  return /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: viewBox,
    xmlns: "http://www.w3.org/2000/svg",
    role: "img",
    "aria-label": "TanzNetzDresden",
    style: {
      display: 'block',
      fill: color,
      width: width || '100%',
      aspectRatio: String(ratio),
      overflow: 'visible',
      ...style
    },
    dangerouslySetInnerHTML: {
      __html: inner
    }
  }, rest));
}
Object.assign(__ds_scope, { Logo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Logo.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * TNDD Tag — the mono, UPPERCASE eyebrow/kicker with a square "voice" marker.
 * Used for section labels, dates, captions. Wide tracking, no rounding.
 */
function Tag({
  children,
  color = 'var(--magenta)',
  marker = true,
  markerColor = 'var(--magenta)',
  size = 12,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: Math.round(size * 0.85),
      fontFamily: 'var(--font-mono)',
      fontWeight: 500,
      fontSize: size,
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color,
      lineHeight: 1,
      whiteSpace: 'nowrap',
      ...style
    }
  }, rest), marker && /*#__PURE__*/React.createElement("span", {
    style: {
      width: Math.round(size * 0.7),
      height: Math.round(size * 0.7),
      background: markerColor,
      flex: '0 0 auto'
    }
  }), children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * TNDD Checkbox — a sharp square box; Magenta fill + white tick when checked.
 * No rounding. Label sits to the right.
 */
function Checkbox({
  checked = false,
  onChange,
  label,
  disabled = false,
  id,
  style = {},
  ...rest
}) {
  const inputId = id || (label ? `cb-${String(label).replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 11,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      fontFamily: 'var(--font-body)',
      fontSize: 15,
      color: 'var(--ink)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      width: 20,
      height: 20,
      flex: '0 0 auto',
      background: checked ? 'var(--magenta)' : 'var(--paper)',
      border: `1.5px solid ${checked ? 'var(--magenta)' : 'var(--ink-muted)'}`,
      borderRadius: 0,
      transition: 'background var(--dur-fast) var(--ease-out), border-color var(--dur-fast)'
    }
  }, checked && /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 20 20",
    width: "20",
    height: "20",
    style: {
      position: 'absolute',
      inset: 0
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 10.5 L8.5 14 L15 6.5",
    fill: "none",
    stroke: "#fff",
    strokeWidth: "2.2",
    strokeLinecap: "square",
    strokeLinejoin: "miter"
  }))), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    type: "checkbox",
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 0,
      height: 0
    }
  }, rest)), label && /*#__PURE__*/React.createElement("span", null, label));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * TNDD Input — sharp text field. Hairline border, Magenta focus.
 * Optional mono UPPERCASE label above. No rounding.
 */
function Input({
  label,
  hint,
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
  invalid = false,
  id,
  style = {},
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const borderColor = invalid ? 'var(--magenta)' : focus ? 'var(--magenta)' : 'var(--rule)';
  const inputId = id || (label ? `in-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 7,
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: 'var(--magenta)'
    }
  }, label), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    type: type,
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 15,
      color: 'var(--ink)',
      background: disabled ? 'var(--tint)' : 'var(--paper)',
      border: `1.5px solid ${borderColor}`,
      borderRadius: 0,
      padding: '11px 13px',
      outline: 'none',
      boxShadow: focus && !invalid ? 'inset 0 -2px 0 var(--magenta)' : 'none',
      transition: 'border-color var(--dur-base) var(--ease-out)'
    }
  }, rest)), hint && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: invalid ? 'var(--magenta)' : 'var(--ink-muted)',
      lineHeight: 1.4
    }
  }, hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * TNDD Switch — a sharp, rectangular toggle (no pill rounding). The track is
 * Cyan when on, neutral when off; the square knob slides edge to edge.
 */
function Switch({
  checked = false,
  onChange,
  label,
  disabled = false,
  id,
  style = {},
  ...rest
}) {
  const inputId = id || (label ? `sw-${String(label).replace(/\s+/g, '-').toLowerCase()}` : undefined);
  const W = 46,
    H = 24,
    pad = 3,
    knob = H - pad * 2;
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 12,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      fontFamily: 'var(--font-body)',
      fontSize: 15,
      color: 'var(--ink)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      width: W,
      height: H,
      flex: '0 0 auto',
      background: checked ? 'var(--cyan)' : 'var(--rule)',
      border: `1.5px solid ${checked ? 'var(--cyan-2)' : 'var(--ink-muted)'}`,
      borderRadius: 0,
      transition: 'background var(--dur-base) var(--ease-out), border-color var(--dur-base)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: pad - 1.5,
      left: checked ? W - knob - pad - 1.5 : pad - 1.5,
      width: knob,
      height: knob,
      background: checked ? 'var(--purple)' : 'var(--paper)',
      borderRadius: 0,
      transition: 'left var(--dur-base) var(--ease-out), background var(--dur-base)'
    }
  })), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    type: "checkbox",
    role: "switch",
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 0,
      height: 0
    }
  }, rest)), label && /*#__PURE__*/React.createElement("span", null, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/layout/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * TNDD Card — a flat, sharp-cornered surface. Depth comes from a hairline rule
 * or a thick Magenta accent edge, never from a drop shadow or rounded corners.
 */
function Card({
  children,
  tone = 'paper',
  accent = 'none',
  accentSide = 'top',
  padding = 20,
  style = {},
  ...rest
}) {
  const tones = {
    paper: {
      background: 'var(--paper)',
      color: 'var(--ink)',
      border: '1px solid var(--rule)'
    },
    tint: {
      background: 'var(--tint)',
      color: 'var(--ink)',
      border: '1px solid transparent'
    },
    purple: {
      background: 'var(--purple)',
      color: '#fff',
      border: '1px solid transparent'
    },
    cyan: {
      background: 'var(--cyan)',
      color: 'var(--purple)',
      border: '1px solid transparent'
    }
  };
  const accents = {
    magenta: 'var(--magenta)',
    cyan: 'var(--cyan)',
    purple: 'var(--purple)',
    none: null
  };
  const t = tones[tone] || tones.paper;
  const accColor = accents[accent];
  const edge = accColor ? {
    [`border${accentSide[0].toUpperCase()}${accentSide.slice(1)}`]: `3px solid ${accColor}`
  } : {};
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: t.background,
      color: t.color,
      border: t.border,
      borderRadius: 0,
      padding,
      ...edge,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/Card.jsx", error: String((e && e.message) || e) }); }

// components/layout/KeilBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * TNDD KeilBar — the signature wedge (Keil) motif as a decorative element.
 * variant 'bar' = the diagonal-cut bottom bar; 'corner' = a clipped corner block.
 * Use as a hero/social bottom accent or a section divider. Magenta as accent only.
 */
function KeilBar({
  variant = 'bar',
  color = 'var(--magenta)',
  height = 24,
  flip = false,
  style = {},
  ...rest
}) {
  const barClip = flip ? 'polygon(0 0, 100% 0, 100% 100%, 28% 100%)' : 'var(--keil-bar)';
  if (variant === 'corner') {
    return /*#__PURE__*/React.createElement("div", _extends({
      style: {
        width: '100%',
        height,
        background: color,
        clipPath: 'var(--keil-corner)',
        ...style
      }
    }, rest));
  }
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      width: '100%',
      height,
      background: color,
      clipPath: barClip,
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { KeilBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/KeilBar.jsx", error: String((e && e.message) || e) }); }

// components/layout/PageBand.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * TNDD PageBand — the signature header band used across letters, covers and
 * newsletters: a full-width Purple (or Cyan) band carrying the logo on the left
 * and optional meta on the right, with a Magenta rule + Keil seam beneath it.
 */
function PageBand({
  tone = 'purple',
  logoPart = 'word',
  logoWidth = 200,
  right,
  rule = true,
  height = 96,
  style = {},
  ...rest
}) {
  const tones = {
    purple: {
      bg: 'var(--purple)',
      logo: '#fff'
    },
    cyan: {
      bg: 'var(--cyan)',
      logo: 'var(--purple)'
    }
  };
  const t = tones[tone] || tones.purple;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      width: '100%',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      background: t.bg,
      height,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 36px',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Logo, {
    part: logoPart,
    color: t.logo,
    width: logoWidth
  })), right && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: '0 0 auto'
    }
  }, right)), rule && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 8,
      background: 'var(--magenta)'
    }
  }), /*#__PURE__*/React.createElement(__ds_scope.KeilBar, {
    color: "var(--magenta)",
    height: 14,
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 8
    }
  })));
}
Object.assign(__ds_scope, { PageBand });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/PageBand.jsx", error: String((e && e.message) || e) }); }

// ui_kits/social/Board.jsx
try { (() => {
// Board.jsx — "Vorstand" story (1080×1920): a 2×2 portrait grid with Keil
// corners and Purple lower-third bands. Photo cells are placeholders.
const DS = window.TanzNetzDresdenDesignSystem_cacd0a;
const PEOPLE = [{
  name: 'Alina\nLucifero',
  role: 'Öffentlichkeit · Studio Round',
  photo: '../../assets/photos/duo-orange-blue.jpg',
  tone: 'var(--cyan)'
}, {
  name: 'Rika\nYotsumoto',
  role: 'Finanzen · KEEP UP',
  photo: '../../assets/photos/duo-silhouette-stage.jpg',
  tone: 'var(--purple-2)'
}, {
  name: 'Justine\nRouquart',
  role: 'Mitglieder · POP UP',
  photo: '../../assets/photos/headstand-solo.jpg',
  tone: 'var(--magenta-2)'
}, {
  name: 'Malte Leonard\nHerz',
  role: 'Überregionales · Dresdance',
  photo: '../../assets/photos/ensemble-curtain-call.jpg',
  tone: 'var(--cyan-2)'
}];
function BoardCard({
  idx,
  person
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: 558,
      background: person.tone,
      overflow: 'hidden',
      clipPath: 'polygon(0 0, 100% 0, 100% 88%, 88% 100%, 0 100%)'
    }
  }, person.photo ? /*#__PURE__*/React.createElement("img", {
    src: person.photo,
    alt: "",
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-mono)',
      fontSize: 22,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.55)'
    }
  }, "Foto"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: 50,
      height: 50,
      background: 'var(--magenta)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 18,
      right: 22,
      fontFamily: 'var(--font-mono)',
      fontWeight: 600,
      fontSize: 24,
      letterSpacing: '0.14em',
      color: 'rgba(255,255,255,0.92)',
      textShadow: '0 1px 10px rgba(0,0,0,0.5)'
    }
  }, String(idx + 1).padStart(2, '0'), " / 04"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: '0 26px',
      height: 156,
      background: 'rgba(46,26,77,0.90)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 46,
      lineHeight: 0.98,
      letterSpacing: '-0.02em',
      color: '#fff',
      whiteSpace: 'pre-line'
    }
  }, person.name), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      fontFamily: 'var(--font-mono)',
      fontWeight: 500,
      fontSize: 24,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--cyan)'
    }
  }, person.role)));
}
function Board({
  kicker = 'Wir stellen vor · 2026',
  title = 'Unser neuer\nVorstand',
  people = PEOPLE
}) {
  const {
    Logo
  } = DS;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 1080,
      height: 1920,
      background: 'var(--purple)',
      overflow: 'hidden',
      padding: '150px 84px 84px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      marginBottom: 30
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 26,
      height: 26,
      background: 'var(--magenta)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontWeight: 500,
      fontSize: 30,
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color: 'var(--cyan)'
    }
  }, kicker)), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 96,
      lineHeight: 0.94,
      letterSpacing: '-0.03em',
      color: '#fff',
      margin: '0 0 18px',
      whiteSpace: 'pre-line'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 248,
      height: 22,
      background: 'var(--cyan)',
      clipPath: 'var(--keil-bar)',
      marginBottom: 56
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '36px 32px'
    }
  }, people.slice(0, 4).map((p, i) => /*#__PURE__*/React.createElement(BoardCard, {
    key: i,
    idx: i,
    person: p
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 84,
      bottom: 70,
      display: 'flex',
      alignItems: 'center',
      gap: 26
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 220
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    part: "mark",
    color: "#fff"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 28,
      letterSpacing: '0.06em',
      color: 'var(--cyan)'
    }
  }, "@tanznetzdresden")));
}
Object.assign(window, {
  Board,
  BoardCard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/social/Board.jsx", error: String((e && e.message) || e) }); }

// ui_kits/social/SocialApp.jsx
try { (() => {
// App.jsx — Social toolkit: pick a format, preview it at scale. Square / Story / Vorstand.
const DS = window.TanzNetzDresdenDesignSystem_cacd0a;
function Scaled({
  w,
  h,
  scale,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: w * scale,
      height: h * scale,
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sheet)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: w,
      height: h,
      transform: `scale(${scale})`,
      transformOrigin: 'top left'
    }
  }, children));
}
const FORMATS = {
  Square: {
    w: 1080,
    h: 1080,
    label: '1:1 · Post',
    render: () => React.createElement(window.Square)
  },
  Story: {
    w: 1080,
    h: 1920,
    label: '9:16 · Story',
    render: () => React.createElement(window.Story)
  },
  Vorstand: {
    w: 1080,
    h: 1920,
    label: '9:16 · Vorstand',
    render: () => React.createElement(window.Board)
  }
};
function SocialApp() {
  const {
    Tag,
    Logo
  } = DS;
  const [active, setActive] = React.useState('Square');
  const f = FORMATS[active];
  const stageH = 560;
  const scale = Math.min(stageH / f.h, 520 / f.w);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      background: 'var(--tint)',
      fontFamily: 'var(--font-body)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      padding: '22px 36px',
      background: 'var(--paper)',
      borderBottom: '1px solid var(--rule)'
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    part: "word",
    color: "var(--purple)",
    width: 150
  }), /*#__PURE__*/React.createElement(Tag, {
    color: "var(--ink-muted)",
    markerColor: "var(--magenta)",
    style: {
      marginLeft: 6
    }
  }, "Social Toolkit"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      gap: 8
    }
  }, Object.keys(FORMATS).map(k => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setActive(k),
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      padding: '10px 16px',
      cursor: 'pointer',
      borderRadius: 0,
      border: `1.5px solid ${active === k ? 'var(--magenta)' : 'var(--rule)'}`,
      background: active === k ? 'var(--magenta)' : 'var(--paper)',
      color: active === k ? '#fff' : 'var(--ink-soft)',
      transition: 'all var(--dur-base) var(--ease-out)'
    }
  }, k)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 40,
      padding: 40,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Scaled, {
    w: f.w,
    h: f.h,
    scale: scale
  }, f.render()), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: 'var(--ink-muted)'
    }
  }, f.w, " \xD7 ", f.h, " px \xB7 ", f.label)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      flex: 1,
      maxWidth: 360
    }
  }, /*#__PURE__*/React.createElement(Tag, null, "Formate"), Object.entries(FORMATS).map(([k, v]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setActive(k),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      textAlign: 'left',
      cursor: 'pointer',
      background: active === k ? 'var(--paper)' : 'transparent',
      borderRadius: 0,
      border: `1px solid ${active === k ? 'var(--magenta)' : 'var(--rule)'}`,
      borderLeft: `3px solid ${active === k ? 'var(--magenta)' : 'var(--rule)'}`,
      padding: 14
    }
  }, /*#__PURE__*/React.createElement(Scaled, {
    w: v.w,
    h: v.h,
    scale: 56 / v.h
  }, v.render()), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 16,
      color: 'var(--purple)'
    }
  }, k), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10.5,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--ink-muted)',
      marginTop: 3
    }
  }, v.label)))), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12.5,
      lineHeight: 1.6,
      color: 'var(--ink-soft)',
      marginTop: 4
    }
  }, "Cyan = Auftakt (Post), Dunkellila = Anker (Story). Magenta nur als Keil-Akzent, nie als Fl\xE4che. Keine runden Ecken, keine Emoji."))));
}
Object.assign(window, {
  SocialApp,
  Scaled
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/social/SocialApp.jsx", error: String((e && e.message) || e) }); }

// ui_kits/social/Square.jsx
try { (() => {
// Square.jsx — Instagram 1:1 (1080×1080). Cyan Auftakt field, Keil bottom bar.
const DS = window.TanzNetzDresdenDesignSystem_cacd0a;
function Square({
  kicker = 'Save the Date',
  title = 'Studio\nRound',
  accent = '#9',
  when = 'Fr · 12. April · 19:30 · Villa Wigman'
}) {
  const {
    Logo,
    Tag
  } = DS;
  const lines = String(title).split('\n');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 1080,
      height: 1080,
      background: 'var(--cyan)',
      overflow: 'hidden',
      padding: 84
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 300,
      marginBottom: 70
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    part: "word",
    color: "var(--purple)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-block',
      background: 'var(--purple)',
      color: '#fff',
      padding: '16px 30px',
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 30,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      marginBottom: 56
    }
  }, kicker), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 132,
      lineHeight: 0.94,
      color: 'var(--purple)',
      letterSpacing: '-0.03em',
      margin: '0 0 36px'
    }
  }, lines.map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, l, i === lines.length - 1 && accent ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--magenta)'
    }
  }, " ", accent) : null))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 30,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: 'var(--purple)',
      fontWeight: 600
    }
  }, when), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 34,
      background: 'var(--magenta)',
      clipPath: 'var(--keil-bar)'
    }
  }));
}
Object.assign(window, {
  Square
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/social/Square.jsx", error: String((e && e.message) || e) }); }

// ui_kits/social/Story.jsx
try { (() => {
// Story.jsx — Instagram story 9:16 (1080×1920). Purple Anker field.
const DS = window.TanzNetzDresdenDesignSystem_cacd0a;
function Story({
  kicker = 'Open Call',
  title = 'POP UP\nexchange',
  accent = '2026',
  when = 'Bewerbung bis 30. April · tanznetzdresden.de'
}) {
  const {
    Logo
  } = DS;
  const lines = String(title).split('\n');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 1080,
      height: 1920,
      background: 'var(--purple)',
      color: '#fff',
      overflow: 'hidden',
      padding: '110px 84px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 440,
      marginBottom: 620
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    part: "word",
    color: "#fff"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 22,
      marginBottom: 36
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 28,
      height: 28,
      background: 'var(--magenta)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontWeight: 500,
      fontSize: 34,
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color: 'var(--cyan)'
    }
  }, kicker)), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 150,
      lineHeight: 0.96,
      letterSpacing: '-0.03em',
      margin: '0 0 30px',
      color: '#fff'
    }
  }, lines.map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, l)), accent && /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--magenta)'
    }
  }, accent)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 30,
      letterSpacing: '0.10em',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.72)',
      fontWeight: 600,
      maxWidth: 760,
      lineHeight: 1.4
    }
  }, when), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 40,
      background: 'var(--magenta)',
      clipPath: 'polygon(0 0, 60% 0, 100% 100%, 0 100%)'
    }
  }));
}
Object.assign(window, {
  Story
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/social/Story.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Footer.jsx
try { (() => {
// Footer.jsx — dark Purple footer with Cyan links and a join CTA.
const DS = window.TanzNetzDresdenDesignSystem_cacd0a;
function Footer({
  onNav
}) {
  const {
    Logo,
    Button,
    KeilBar
  } = DS;
  const cols = [['Programm', ['Studio Round', 'POP UP', 'KEEP UP', 'Profitraining']], ['Verein', ['Über uns', 'Vorstand', 'Mitglied werden', 'Satzung']], ['Kontakt', ['Villa Wigman, Dresden', 'kontakt@tanznetzdresden.de', '@tanznetzdresden']]];
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: 'var(--purple)',
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      borderBottom: '1px solid rgba(255,255,255,0.12)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1180,
      margin: '0 auto',
      padding: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 30
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 30,
      letterSpacing: '-0.02em',
      margin: 0,
      color: '#fff'
    }
  }, "Teil des Netzes werden."), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    marker: true,
    onClick: () => onNav('Mitglied')
  }, "Mitglied werden"))), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1180,
      margin: '0 auto',
      padding: '44px 40px 16px',
      display: 'grid',
      gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
      gap: 30
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Logo, {
    part: "word",
    color: "#fff",
    width: 180
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      lineHeight: 1.6,
      color: 'rgba(255,255,255,0.7)',
      maxWidth: 260,
      marginTop: 18
    }
  }, "Netzwerk der freien Tanzszene Dresdens. Seit 2010.")), cols.map(([h, links]) => /*#__PURE__*/React.createElement("div", {
    key: h
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: 'var(--cyan)',
      fontWeight: 600,
      marginBottom: 14
    }
  }, h), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      margin: 0,
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 9
    }
  }, links.map(l => /*#__PURE__*/React.createElement("li", {
    key: l
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => e.preventDefault(),
    style: {
      fontSize: 13.5,
      color: 'rgba(255,255,255,0.82)',
      textDecoration: 'none'
    },
    onMouseEnter: e => {
      e.currentTarget.style.color = 'var(--cyan)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.color = 'rgba(255,255,255,0.82)';
    }
  }, l))))))), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1180,
      margin: '0 auto',
      padding: '16px 40px 36px',
      borderTop: '1px solid rgba(255,255,255,0.12)',
      display: 'flex',
      justifyContent: 'space-between',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'rgba(255,255,255,0.5)',
      letterSpacing: '0.04em'
    }
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 TanzNetzDresden e.V."), /*#__PURE__*/React.createElement("span", null, "Impressum \xB7 Datenschutz")));
}
Object.assign(window, {
  Footer
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Footer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Formats.jsx
try { (() => {
// Formats.jsx — the recurring TNDD formats as a sharp grid of flat cards.
const DS = window.TanzNetzDresdenDesignSystem_cacd0a;
const FORMATS = [{
  n: '01',
  t: 'Studio Round',
  d: 'Offenes Showing mit moderiertem Gespräch — seit 2024 überregional mit dem Tanznetz Freiburg und dem ID Frankfurt.',
  tone: 'paper'
}, {
  n: '02',
  t: 'POP UP',
  d: 'Niedrigschwelliges Aufführungsformat seit 2019. 2027 wieder mit zwei Ausgaben in Dresden.',
  tone: 'paper'
}, {
  n: '03',
  t: 'KEEP UP Training',
  d: 'Profitraining 3–5× wöchentlich in der TENZA, mit wechselnden lokalen und internationalen Dozent:innen. Seit 2022.',
  tone: 'paper'
}, {
  n: '04',
  t: 'vision:danceable',
  d: 'Kurzstückreihe am Societaetstheater — mit der 4 rooms company und dem about blank collective. Seit 2024.',
  tone: 'paper'
}];
function Formats({
  onNav
}) {
  const {
    Tag,
    Card,
    Badge
  } = DS;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--tint)',
      padding: '64px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1180,
      margin: '0 auto',
      padding: '0 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 30
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Tag, {
    style: {
      marginBottom: 14
    }
  }, "Was wir tun"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 40,
      letterSpacing: '-0.02em',
      color: 'var(--purple)',
      margin: 0
    }
  }, "Formate & Reihen")), /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onNav('Formate');
    },
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--magenta)',
      textDecoration: 'none',
      fontWeight: 600
    }
  }, "Alle Formate \u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 16
    }
  }, FORMATS.map(f => /*#__PURE__*/React.createElement(Card, {
    key: f.n,
    tone: "paper",
    accent: "magenta",
    padding: 22,
    style: {
      minHeight: 210,
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    variant: "outline",
    size: "sm",
    style: {
      alignSelf: 'flex-start',
      marginBottom: 16
    }
  }, f.n), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 22,
      color: 'var(--purple)',
      margin: '0 0 10px',
      letterSpacing: '-0.01em'
    }
  }, f.t), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13.5,
      lineHeight: 1.55,
      color: 'var(--ink-soft)',
      margin: 0
    }
  }, f.d))))));
}
Object.assign(window, {
  Formats
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Formats.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Header.jsx
try { (() => {
// Header.jsx — TanzNetzDresden public site header. Sticky nav, uppercase tracked.
const DS = window.TanzNetzDresdenDesignSystem_cacd0a;
function Header({
  active,
  onNav
}) {
  const {
    Logo,
    Button
  } = DS;
  const items = ['Programm', 'Formate', 'Netzwerk', 'Über uns'];
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 20,
      background: 'var(--paper)',
      borderBottom: '1px solid var(--rule)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1180,
      margin: '0 auto',
      padding: '20px 40px',
      display: 'flex',
      alignItems: 'center',
      gap: 40
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onNav('Start');
    },
    style: {
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    part: "word",
    color: "var(--purple)",
    width: 190
  })), /*#__PURE__*/React.createElement("nav", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      gap: 30
    }
  }, items.map(it => /*#__PURE__*/React.createElement("a", {
    key: it,
    href: "#",
    onClick: e => {
      e.preventDefault();
      onNav(it);
    },
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      textDecoration: 'none',
      color: active === it ? 'var(--magenta)' : 'var(--ink-soft)',
      paddingBottom: 4,
      borderBottom: active === it ? '2px solid var(--magenta)' : '2px solid transparent',
      transition: 'color var(--dur-base) var(--ease-out)'
    },
    onMouseEnter: e => {
      if (active !== it) e.currentTarget.style.color = 'var(--magenta)';
    },
    onMouseLeave: e => {
      if (active !== it) e.currentTarget.style.color = 'var(--ink-soft)';
    }
  }, it))), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    marker: true,
    onClick: () => onNav('Mitglied')
  }, "Mitglied werden")));
}
Object.assign(window, {
  Header
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Header.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Hero.jsx
try { (() => {
// Hero.jsx — full-bleed-ish hero. XXL headline with Magenta accent line,
// CTAs, and a Cyan photo field with a Keil corner (placeholder for real imagery).
const DS = window.TanzNetzDresdenDesignSystem_cacd0a;
function Hero({
  onNav
}) {
  const {
    Tag,
    Button,
    KeilBar,
    Logo
  } = DS;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 1180,
      margin: '0 auto',
      padding: '72px 40px 56px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.35fr 1fr',
      gap: 56,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Tag, {
    style: {
      marginBottom: 22
    }
  }, "Freie Tanzszene \xB7 Dresden"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 68,
      lineHeight: 1.0,
      letterSpacing: '-0.03em',
      color: 'var(--purple)',
      margin: '0 0 22px'
    }
  }, "Eine Stadt.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--magenta)'
    }
  }, "Ein Netz.")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 18,
      lineHeight: 1.55,
      color: 'var(--ink-soft)',
      maxWidth: 460,
      margin: '0 0 30px'
    }
  }, "TanzNetzDresden verbindet \xFCber 70 Tanzschaffende \u2014 mit Formaten, Diskurs und Residenzen f\xFCr die freie Szene. Seit 2010."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    marker: true,
    onClick: () => onNav('Programm')
  }, "Programm 2026"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    onClick: () => onNav('Netzwerk')
  }, "Das Netzwerk"))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: 380,
      background: 'var(--purple)',
      overflow: 'hidden',
      clipPath: 'polygon(0 0, 100% 0, 100% 86%, 86% 100%, 0 100%)',
      display: 'flex',
      alignItems: 'flex-end',
      padding: 26
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/photos/duo-orange-blue.jpg",
    alt: "Zwei Tanzende in orangem und blauem Licht",
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: 34,
      height: 34,
      background: 'var(--magenta)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: '#fff',
      fontWeight: 600,
      background: 'rgba(46,26,77,0.90)',
      padding: '10px 14px'
    }
  }, "vision:danceable \xB7 2027")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 26,
      bottom: -1
    }
  }, /*#__PURE__*/React.createElement(KeilBar, {
    color: "var(--magenta)",
    height: 16,
    style: {
      width: 200
    }
  })))));
}
Object.assign(window, {
  Hero
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Programme.jsx
try { (() => {
// Programme.jsx — upcoming events list + a dark stats/quote band.
const DS = window.TanzNetzDresdenDesignSystem_cacd0a;
const EVENTS = [{
  day: '12',
  mo: 'Apr',
  t: 'Studio Round',
  w: 'Villa Wigman · 19:30 Uhr · mit Gästen aus Freiburg & Frankfurt',
  tag: 'Showing'
}, {
  day: '29',
  mo: 'Apr',
  t: 'Welttanztag · Tanzparcours',
  w: 'Stadtraum Dresden · mit Dresdner Tanzschulen',
  tag: 'Aktion'
}, {
  day: '29',
  mo: 'Apr',
  t: 'vision:danceable',
  w: 'Societaetstheater · Kurzstücke & Tanzfilme',
  tag: 'Bühne'
}, {
  day: '14',
  mo: 'Jun',
  t: 'KEEP UP · Profitraining',
  w: 'TENZA · 10:00–11:30 Uhr · Contemporary',
  tag: 'Training'
}];
function Programme({
  onNav
}) {
  const {
    Tag,
    Badge
  } = DS;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 1180,
      margin: '0 auto',
      padding: '64px 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 360px',
      gap: 56,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Tag, {
    style: {
      marginBottom: 14
    }
  }, "Demn\xE4chst"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 40,
      letterSpacing: '-0.02em',
      color: 'var(--purple)',
      margin: '0 0 24px'
    }
  }, "Programm 2026"), /*#__PURE__*/React.createElement("div", null, EVENTS.map((ev, i) => /*#__PURE__*/React.createElement("a", {
    key: i,
    href: "#",
    onClick: e => {
      e.preventDefault();
      onNav('Programm');
    },
    style: {
      display: 'grid',
      gridTemplateColumns: '64px 1fr auto',
      gap: 22,
      alignItems: 'center',
      padding: '18px 6px',
      borderTop: '1px solid var(--rule)',
      textDecoration: 'none',
      transition: 'background var(--dur-fast)'
    },
    onMouseEnter: e => {
      e.currentTarget.style.background = 'var(--tint)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = 'transparent';
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 30,
      color: 'var(--magenta)',
      lineHeight: 1
    }
  }, ev.day), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: 'var(--ink-muted)',
      fontWeight: 600
    }
  }, ev.mo)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 18,
      color: 'var(--purple)',
      letterSpacing: '-0.005em',
      marginBottom: 3
    }
  }, ev.t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13.5,
      color: 'var(--ink-soft)'
    }
  }, ev.w)), /*#__PURE__*/React.createElement(Badge, {
    variant: "cyan",
    size: "sm"
  }, ev.tag))))), /*#__PURE__*/React.createElement("aside", {
    style: {
      background: 'var(--purple)',
      color: '#fff',
      padding: 30,
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(Tag, {
    color: "var(--cyan)",
    style: {
      marginBottom: 22
    }
  }, "In Zahlen"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 22
    }
  }, [['70+', 'Tanzschaffende im Netzwerk'], ['15+', 'Jahre für die freie Szene'], ['5', 'Editionen vision:danceable seit 2024']].map(([n, l]) => /*#__PURE__*/React.createElement("div", {
    key: n
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 52,
      color: 'var(--cyan)',
      lineHeight: 0.95,
      letterSpacing: '-0.03em'
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.78)',
      marginTop: 4
    }
  }, l)))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: -1,
      bottom: -1,
      width: 80,
      height: 80,
      background: 'var(--magenta)',
      clipPath: 'polygon(100% 0, 100% 100%, 0 100%)'
    }
  }))));
}
Object.assign(window, {
  Programme
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Programme.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/SiteApp.jsx
try { (() => {
// App.jsx — composes the public TanzNetzDresden site. Interactive nav + a join modal.
const DS = window.TanzNetzDresdenDesignSystem_cacd0a;
function JoinModal({
  open,
  onClose
}) {
  const {
    Logo,
    Input,
    Checkbox,
    Button,
    Tag
  } = DS;
  const [sent, setSent] = React.useState(false);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      background: 'rgba(46,26,77,0.55)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: 460,
      maxWidth: '100%',
      background: 'var(--paper)',
      borderTop: '8px solid var(--magenta)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 30
    }
  }, !sent ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Tag, {
    style: {
      marginBottom: 16
    }
  }, "Mitglied werden"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 28,
      letterSpacing: '-0.02em',
      color: 'var(--purple)',
      margin: '0 0 20px'
    }
  }, "Teil des Netzes", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--magenta)'
    }
  }, "werden.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Name",
    placeholder: "Vor- und Nachname"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "E-Mail",
    type: "email",
    placeholder: "name@verein.de"
  }), /*#__PURE__*/React.createElement(Checkbox, {
    checked: true,
    label: "Ich habe die Satzung gelesen.",
    onChange: () => {}
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    marker: true,
    onClick: () => setSent(true)
  }, "Antrag senden"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    onClick: onClose
  }, "Abbrechen"))) : /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '20px 0 8px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 120,
      margin: '0 auto 22px'
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    part: "mark",
    color: "var(--purple)"
  })), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 26,
      color: 'var(--purple)',
      margin: '0 0 10px'
    }
  }, "Willkommen!"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      color: 'var(--ink-soft)',
      margin: '0 0 22px'
    }
  }, "Wir melden uns bei dir. Sch\xF6n, dass du dabei bist."), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    onClick: onClose
  }, "Schlie\xDFen")))));
}
function WebsiteApp() {
  const [active, setActive] = React.useState('Start');
  const [join, setJoin] = React.useState(false);
  const onNav = x => {
    if (x === 'Mitglied') {
      setJoin(true);
      return;
    }
    setActive(x);
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--paper)',
      minHeight: '100vh'
    }
  }, /*#__PURE__*/React.createElement(Header, {
    active: active,
    onNav: onNav
  }), /*#__PURE__*/React.createElement(Hero, {
    onNav: onNav
  }), /*#__PURE__*/React.createElement(Formats, {
    onNav: onNav
  }), /*#__PURE__*/React.createElement(Programme, {
    onNav: onNav
  }), /*#__PURE__*/React.createElement(Footer, {
    onNav: onNav
  }), /*#__PURE__*/React.createElement(JoinModal, {
    open: join,
    onClose: () => setJoin(false)
  }));
}
Object.assign(window, {
  WebsiteApp,
  JoinModal
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/SiteApp.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.KeilBar = __ds_scope.KeilBar;

__ds_ns.PageBand = __ds_scope.PageBand;

})();
