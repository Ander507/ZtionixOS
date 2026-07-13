import type { AppDefinition, AppContext } from '../../types';
import { ICONS } from '../../utils';

function renderCalculator(_ctx: AppContext, container: HTMLElement): void {
  container.className = 'app-calculator';
  let display = '0';
  let prev = '';
  let op = '';

  container.innerHTML = `
    <div class="calc-display">0</div>
    <div class="calc-buttons">
      <button data-val="C" class="calc-btn calc-clear">C</button>
      <button data-val="±" class="calc-btn">±</button>
      <button data-val="%" class="calc-btn">%</button>
      <button data-val="/" class="calc-btn calc-op">÷</button>
      <button data-val="7" class="calc-btn">7</button>
      <button data-val="8" class="calc-btn">8</button>
      <button data-val="9" class="calc-btn">9</button>
      <button data-val="*" class="calc-btn calc-op">×</button>
      <button data-val="4" class="calc-btn">4</button>
      <button data-val="5" class="calc-btn">5</button>
      <button data-val="6" class="calc-btn">6</button>
      <button data-val="-" class="calc-btn calc-op">−</button>
      <button data-val="1" class="calc-btn">1</button>
      <button data-val="2" class="calc-btn">2</button>
      <button data-val="3" class="calc-btn">3</button>
      <button data-val="+" class="calc-btn calc-op">+</button>
      <button data-val="0" class="calc-btn calc-zero">0</button>
      <button data-val="." class="calc-btn">.</button>
      <button data-val="=" class="calc-btn calc-eq">=</button>
    </div>
  `;

  const displayEl = container.querySelector('.calc-display') as HTMLElement;

  const updateDisplay = () => {
    displayEl.textContent = display;
    const len = display.length;
    if (len > 14) displayEl.style.fontSize = '18px';
    else if (len > 10) displayEl.style.fontSize = '24px';
    else if (len > 7) displayEl.style.fontSize = '30px';
    else displayEl.style.fontSize = '40px';
  };

  const calculate = (): void => {
    const a = parseFloat(prev);
    const b = parseFloat(display);
    if (isNaN(a) || isNaN(b)) return;
    let result = 0;
    switch (op) {
      case '+': result = a + b; break;
      case '-': result = a - b; break;
      case '*': result = a * b; break;
      case '/': result = b !== 0 ? a / b : NaN; break;
      case '%': result = a % b; break;
    }
    display = isNaN(result) ? 'Error' : String(parseFloat(result.toPrecision(12)));
    prev = '';
    op = '';
    updateDisplay();
  };

  container.querySelectorAll('.calc-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = (btn as HTMLElement).dataset.val!;

      if (val === 'C') {
        display = '0';
        prev = '';
        op = '';
      } else if (val === '±') {
        if (display !== '0' && display !== 'Error') {
          display = display.startsWith('-') ? display.slice(1) : `-${display}`;
        }
      } else if (val === '=') {
        if (op) calculate();
      } else if (['+', '-', '*', '/', '%'].includes(val)) {
        if (op) calculate();
        prev = display;
        op = val;
        display = '0';
      } else if (val === '.') {
        if (!display.includes('.')) display += '.';
      } else {
        display = display === '0' ? val : display + val;
      }
      updateDisplay();
    });
  });

  container.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace') {
      if (display.length > 1) display = display.slice(0, -1);
      else display = '0';
      updateDisplay();
      e.preventDefault();
      return;
    }

    const keyMap: Record<string, string> = {
      '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
      '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
      '+': '+', '-': '-', '*': '*', '/': '/',
      '.': '.', 'Enter': '=', '=': '=', 'Escape': 'C',
    };
    const mapped = keyMap[e.key];
    if (mapped) {
      const btn = container.querySelector(`[data-val="${mapped === '=' ? '=' : mapped}"]`) as HTMLButtonElement;
      btn?.click();
      e.preventDefault();
    }
  });

  container.tabIndex = 0;
}

export const calculatorApp: AppDefinition = {
  id: 'calculator',
  name: 'Calculator',
  icon: ICONS.calculator,
  defaultSize: { width: 268, height: 366 },
  resizable: false,
  maximizable: false,
  createWindow: renderCalculator,
};
