/*
 * Port of the upstream Popups settingsDialog/settingsDialogRenderer surface.
 *
 * The template, renderer method names, help toggle, and event binding mirror
 * mediawiki-extensions-Popups src/ui/templates/settingsDialog/settingsDialog.js
 * and src/ui/settingsDialogRenderer.js.  Host storage remains outside this file.
 */

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

function message(messages, key) {
  return (messages && messages[key]) || key;
}

function escapeChoices(choices = []) {
  return choices.map(({ id, name, description, isChecked }) => ({
    id: escapeHTML(id),
    name: escapeHTML(name),
    description: description ? escapeHTML(description) : '',
    isChecked
  }));
}

export function renderSettingsDialog(model) {
  const heading = escapeHTML(model.heading);
  const saveLabel = escapeHTML(model.saveLabel);
  const closeLabel = escapeHTML(model.closeLabel);
  const helpText = escapeHTML(model.helpText);
  const okLabel = escapeHTML(model.okLabel);
  const choices = escapeChoices(model.choices);
  const node = document.createElement('div');
  node.innerHTML = `
    <section id='mwe-popups-settings'>
      <header>
        <div>
          <button class='cdx-button cdx-button--weight-quiet cdx-button--icon-only'>
            <span class='popups-icon popups-icon--close close'></span>
            <span>${ closeLabel }</span>
          </button>
        </div>
        <h1>${ heading }</h1>
        <div>
          <button class='save cdx-button cdx-button--weight-primary cdx-button--action-progressive'>${ saveLabel }</button>
          <button class='okay cdx-button cdx-button--weight-primary cdx-button--action-progressive' style='display:none;'>${ okLabel }</button>
        </div>
      </header>
      <main id='mwe-popups-settings-form'>
        <form>
          ${ choices.map(({ id, name, description, isChecked }) => `
          <p class="cdx-checkbox">
            <input
              ${ isChecked ? 'checked' : '' }
              value='${ id }'
              type='checkbox'
              id='mwe-popups-settings-${ id }'
              class='cdx-checkbox__input'>
            <span class="cdx-checkbox__icon">&nbsp;</span>
            <label class="cdx-checkbox__label" for='mwe-popups-settings-${ id }'>
              <span>${ name }</span>
              ${ description }
            </label>
          </p>`).join('') }
        </form>
      </main>
      <div class='mwe-popups-settings-help' style='display:none;'>
        <div class="popups-icon popups-icon--footer"></div>
        <p>${ helpText }</p>
      </div>
    </section>
  `.trim();
  return node.querySelector('section');
}

function makeSettingsChoice(messages, previewType, enabled) {
  return Object.freeze({
    id: previewType,
    name: message(messages, `popups-settings-option-${previewType}`),
    description: message(messages, `popups-settings-option-${previewType}-description`),
    isChecked: enabled
  });
}

function makeSettingsModel(messages, previewTypesEnabled = {}) {
  return Object.freeze({
    heading: message(messages, 'popups-settings-title'),
    closeLabel: message(messages, 'popups-settings-cancel'),
    saveLabel: message(messages, 'popups-settings-save'),
    helpText: message(messages, 'popups-settings-help'),
    okLabel: message(messages, 'popups-settings-help-ok'),
    choices: Object.keys(previewTypesEnabled).map((previewType) => (
      makeSettingsChoice(messages, previewType, previewTypesEnabled[previewType])
    ))
  });
}

function initDialog(messages, boundActions, previewTypesEnabled) {
  const dialog = renderSettingsDialog(makeSettingsModel(messages, previewTypesEnabled));
  dialog.querySelector('.save').addEventListener('click', () => {
    boundActions.saveSettings(
      Array.from(dialog.querySelectorAll('input')).reduce((enabled, el) => {
        enabled[el.value] = el.matches(':checked');
        return enabled;
      }, {})
    );
  });
  dialog.querySelector('.okay').addEventListener('click', boundActions.hideSettings);
  dialog.querySelector('.close').addEventListener('click', boundActions.hideSettings);
  return dialog;
}

function hideAll(nodes) {
  Array.prototype.forEach.call(nodes, (node) => {
    node.style.display = 'none';
  });
}

function showAll(nodes) {
  Array.prototype.forEach.call(nodes, (node) => {
    node.style.display = '';
  });
}

export function toggleHelp(dialog, visible) {
  const formSelectors = 'main, .save, .close';
  const helpSelectors = '.mwe-popups-settings-help, .okay';
  if (visible) {
    hideAll(dialog.querySelectorAll(formSelectors));
    showAll(dialog.querySelectorAll(helpSelectors));
  } else {
    showAll(dialog.querySelectorAll(formSelectors));
    hideAll(dialog.querySelectorAll(helpSelectors));
  }
}

function requestIdle(callback) {
  if (typeof window !== 'undefined' && window.mw && typeof window.mw.requestIdleCallback === 'function') {
    window.mw.requestIdleCallback(callback);
    return;
  }
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(callback);
    return;
  }
  window.setTimeout(callback, 0);
}

function waitForCodexStyles() {
  if (typeof window !== 'undefined' && window.mw && window.mw.loader && typeof window.mw.loader.using === 'function') {
    return window.mw.loader.using('codex-styles');
  }
  return Promise.resolve();
}

export function createSettingsDialogRenderer(messages = {}) {
  let dialog;
  let overlay;
  let generation = 0;

  return (boundActions, previewTypesEnabled) => {
    if (!dialog) {
      overlay = document.createElement('div');
      overlay.classList.add('mwe-popups-overlay');
      overlay.style.display = 'none';
      dialog = initDialog(messages, boundActions, previewTypesEnabled);
      generation += 1;
    }
    const instanceGeneration = generation;

    return {
      refresh(previewTypesEnabledNew) {
        const parent = dialog.parentNode;
        dialog.remove();
        dialog = initDialog(messages, boundActions, previewTypesEnabledNew);
        if (parent) {
          parent.appendChild(dialog);
        }
      },
      appendTo(el) {
        el.appendChild(overlay);
        overlay.appendChild(dialog);
      },
      show() {
        const target = overlay;
        waitForCodexStyles().then(() => {
          requestIdle(() => {
            if (generation === instanceGeneration && overlay === target && target) {
              target.style.display = '';
            }
          });
        });
      },
      hide() {
        if (overlay) overlay.style.display = 'none';
      },
      toggleHelp(visible) {
        toggleHelp(dialog, visible);
      },
      setEnabled(enabled) {
        Object.keys(enabled).forEach((type) => {
          const node = dialog.querySelector(`#mwe-popups-settings-${CSS.escape(type)}`);
          if (node) {
            node.checked = enabled[type];
          }
        });
      },
      destroy() {
        if (generation !== instanceGeneration) return;
        generation += 1;
        if (overlay && overlay.parentNode) overlay.remove();
        overlay = null;
        dialog = null;
      }
    };
  };
}
