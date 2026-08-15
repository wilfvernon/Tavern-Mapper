export function updateRecentColors(colors, hex, limit = 8) {
  const normalized = hex.toLowerCase();
  return [normalized, ...colors.filter(color => color !== normalized)].slice(0, limit);
}

export function createSharedColorPicker({ documentRef = document, recentLimit = 8 } = {}) {
  let recentColors = [];
  const registry = [];

  function makeSwatch(hex, onPick) {
    const button = documentRef.createElement('button');
    button.dataset.color = hex;
    button.style.background = hex;
    button.style.width = '28px';
    button.style.height = '28px';
    button.style.borderRadius = '6px';
    button.style.flex = 'none';
    button.style.border = '1px solid var(--panel-border)';
    button.addEventListener('click', () => onPick(hex));
    return button;
  }

  function highlight(presetContainer, recentContainer, hex) {
    const target = (hex || '').toLowerCase();
    [...presetContainer.children, ...recentContainer.children].forEach((child) => {
      child.style.border = child.dataset.color?.toLowerCase() === target
        ? '2px solid #fff'
        : '1px solid var(--panel-border)';
    });
  }

  function renderRecentColors() {
    registry.forEach((entry) => {
      entry.recentContainer.innerHTML = '';
      recentColors.forEach(color => entry.recentContainer.appendChild(makeSwatch(color, entry.pick)));
    });
  }

  function addRecentColor(hex) {
    recentColors = updateRecentColors(recentColors, hex, recentLimit);
    renderRecentColors();
  }

  function setup(presetContainer, recentContainer, wheelInput, presetColors, initialColor, onPick) {
    function pick(hex) {
      onPick(hex);
      highlight(presetContainer, recentContainer, hex);
      wheelInput.value = hex;
    }

    presetColors.forEach(color => presetContainer.appendChild(makeSwatch(color, pick)));
    wheelInput.value = initialColor;
    wheelInput.addEventListener('input', () => {
      pick(wheelInput.value);
      addRecentColor(wheelInput.value);
    });

    const entry = { presetContainer, recentContainer, pick };
    registry.push(entry);
    highlight(presetContainer, recentContainer, initialColor);
    return entry;
  }

  return { setup, highlight };
}