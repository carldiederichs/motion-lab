import type { Problem } from './model.ts';

// LeetCode mark from Simple Icons, CC0 (docs/SIMPLE-ICONS-LICENSE.txt).
const leetcodePath =
  'M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z';

export function renderProblem(container: HTMLElement, problem: Problem | undefined): void {
  container.replaceChildren();
  container.hidden = problem === undefined;
  if (problem === undefined) return;

  const heading = document.createElement('h2');
  heading.id = 'mp-problem-title';
  heading.textContent =
    problem.source.relationship === 'exact' ? 'The problem' : 'Related LeetCode problem';
  const link = document.createElement('a');
  link.href = `https://leetcode.com/problems/${problem.source.slug}/`;
  link.className = 'mp-problem-source';
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', leetcodePath);
  icon.append(path);
  const label = document.createElement('span');
  label.textContent = `LeetCode ${String(problem.source.number)} · ${problem.source.title}`;
  const arrow = document.createElement('span');
  arrow.textContent = '↗';
  arrow.setAttribute('aria-hidden', 'true');
  link.append(icon, label, arrow);
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  const header = document.createElement('div');
  header.className = 'mp-problem-head';
  header.append(heading, link);

  const statement = document.createElement('p');
  statement.textContent = problem.statement;
  const note = document.createElement('p');
  note.className = 'mp-problem-note';
  note.textContent = problem.source.note;
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = 'Example and problem constraints';
  const example = document.createElement('pre');
  example.textContent = `Input: ${problem.example.input}\nOutput: ${problem.example.output}`;
  const explanation = document.createElement('p');
  explanation.textContent = problem.example.explanation;
  const constraints = document.createElement('ul');
  for (const constraint of problem.constraints) {
    const item = document.createElement('li');
    item.textContent = constraint;
    constraints.append(item);
  }
  const bounds = document.createElement('p');
  bounds.className = 'mp-problem-note';
  bounds.textContent =
    'These are the original problem constraints. The interactive inputs below use smaller limits so each step stays readable.';
  details.append(summary, example, explanation, constraints, bounds);
  container.append(header, statement, note, details);
}
