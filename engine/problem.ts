import type { Problem } from './model.ts';

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
  path.setAttribute('d', 'M8 6 2 12l6 6M16 6l6 6-6 6M14 4l-4 16');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '2');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
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
