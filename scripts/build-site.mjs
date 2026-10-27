/**
 * Builds the GitHub Pages site into `_site/`:
 *
 * - `<skill-name>.zip`: the skill directory, zipped with the directory at the top level, which is the
 *   layout Claude.ai and Claude Desktop expect for uploaded skills
 * - `index.json`: a machine-readable catalog of every skill
 * - `index.html`: a human-readable catalog rendered from `site/index.html`
 * - every other file in `site/` (e.g. the logo), copied as-is
 *
 * `site/index.html` is a template: `{{repo}}`, `{{skillCount}}` and `{{skills}}` are replaced at
 * build time. The markup for each skill lives in `renderSkill()` below.
 *
 * Run `npm run validate` first; this script assumes the skills are valid.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadSkills, repoRoot, skillsDir } from './lib/skills.mjs';

const repo = process.env.GITHUB_REPOSITORY ?? 'openmrs/openmrs-contrib-ai-skills';
const siteDir = join(repoRoot, 'site');
const outDir = join(repoRoot, '_site');

rmSync(outDir, { recursive: true, force: true });
cpSync(siteDir, outDir, { recursive: true, filter: (src) => src !== join(siteDir, 'index.html') });
mkdirSync(outDir, { recursive: true });

const catalog = loadSkills().map(({ dirName, frontmatter }) => {
  const zip = `${dirName}.zip`;
  // -X drops platform-specific attributes so zips are identical regardless of who builds them
  execFileSync('zip', ['-qrX', join(outDir, zip), dirName], { cwd: skillsDir });
  return {
    name: frontmatter.name,
    description: frontmatter.description,
    version: frontmatter.metadata.version,
    zip,
    source: `https://github.com/${repo}/tree/main/skills/${dirName}`,
  };
});

writeFileSync(join(outDir, 'index.json'), JSON.stringify({ repository: repo, skills: catalog }, null, 2) + '\n');
writeFileSync(join(outDir, 'index.html'), renderHtml(catalog));
console.log(`Built ${catalog.length} skill(s) into ${outDir}`);

function escape(s) {
  return String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function renderHtml(skills) {
  const values = {
    repo: escape(repo),
    skillCount: `${skills.length} skill${skills.length === 1 ? '' : 's'}`,
    skills: skills.map(renderSkill).join(''),
  };
  // A replacer function keeps `$` sequences in skill text from being treated as replacement patterns
  return readFileSync(join(siteDir, 'index.html'), 'utf8').replace(/\{\{(\w+)\}\}/g, (match, key) =>
    key in values ? values[key] : match,
  );
}

function renderSkill(s) {
  return `
    <article>
      <header>
        <h3>${escape(s.name)}</h3>
        <span class="version">v${escape(s.version)}</span>
      </header>
      <p>${escape(s.description)}</p>
      <div class="cmd">
        <pre>npx skills add ${escape(repo)} --skill ${escape(s.name)}</pre>
        <button type="button" class="copy" aria-label="Copy install command for ${escape(s.name)}">Copy</button>
      </div>
      <div class="actions">
        <a class="btn btn-primary" href="${escape(s.zip)}">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>
          Download zip
        </a>
        <a class="btn btn-secondary" href="${escape(s.source)}">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 8l-5 4 5 4"/><path d="M15 8l5 4-5 4"/></svg>
          View source
        </a>
      </div>
    </article>
`;
}
