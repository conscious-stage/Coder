#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// For ES modules, derive __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Root directory of the project (where script is run)
const ROOT = process.cwd();
// Directory to output documentation
const DOC_ROOT = path.join(ROOT, 'documentation');

// Recursively collect all files under a directory, excluding certain folders
function getAllFiles(dir, filelist = []) {
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    if (entry === '.git' || entry === 'documentation' || entry === 'node_modules') continue;
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getAllFiles(fullPath, filelist);
    } else {
      filelist.push(fullPath);
    }
  }
  return filelist;
}

// Resolve import paths to actual files
function resolveImport(fromFile, importPath) {
  if (!importPath.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), importPath);
  const exts = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'];
  for (const ext of exts) {
    const candidate = base + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
    // support index files in directories
    const indexCandidate = path.join(base + ext, 'index.js');
    if (fs.existsSync(indexCandidate)) {
      return indexCandidate;
    }
  }
  return null;
}

// Create documentation for a single file
function docForFile(filePath) {
  const relPath = path.relative(ROOT, filePath);
  const docPath = path.join(DOC_ROOT, relPath + '.md');
  // Ensure directory exists
  fs.mkdirSync(path.dirname(docPath), { recursive: true });
  const content = fs.readFileSync(filePath, 'utf-8');
  // Extract summary
  let summary = '';
  const headerLines = content.split('\n').slice(0, 10);
  const commentLines = headerLines.filter(l => l.trim().startsWith('//') || l.trim().startsWith('/*'));
  if (commentLines.length) {
    summary = commentLines.map(l =>
      l
        .replace(/^\s*\/\/\s?/, '')
        .replace(/^\s*\/\*+\s?/, '')
        .replace(/\*+\//, '')
        .trim()
    ).join(' ');
  } else if (/\.tsx?$/.test(filePath) && /import .*react/i.test(content)) {
    summary = `Defines the ${path.basename(filePath)} React component for UI.`;
  } else if (/\.sh$/.test(filePath)) {
    summary = `Shell script for ${path.basename(filePath)}.`;
  } else if (/\.json$/.test(filePath)) {
    summary = `JSON configuration file for ${path.basename(filePath)}.`;
  } else {
    summary = `Module for ${relPath}.`;
  }
  // Extract functionalities (exported symbols)
  const extras = [];
  const exportFunc = /export function (\w+)/g;
  const exportConst = /export const (\w+)\s?=/g;
  const exportDefault = /export default function (\w*)/g;
  let m;
  while ((m = exportFunc.exec(content))) extras.push(m[1]);
  while ((m = exportConst.exec(content))) extras.push(m[1]);
  while ((m = exportDefault.exec(content))) {
    extras.push(m[1] || 'default');
  }
  // Extract related files via imports
  const related = new Set();
  const importRegex = /import .* from ['"](.+)['"]/g;
  while ((m = importRegex.exec(content))) {
    const imp = m[1];
    const target = resolveImport(filePath, imp);
    if (target) {
      related.add(path.relative(ROOT, target));
    }
  }
  // Build markdown content
  const lines = [];
  lines.push(`# ${relPath}`);
  lines.push('');
  lines.push('## Summary');
  lines.push(summary);
  if (extras.length) {
    lines.push('');
    lines.push('## Functionalities');
    extras.forEach(fn => lines.push(`- ${fn}`));
  }
  if (related.size) {
    lines.push('');
    lines.push('## Related files');
    related.forEach(rp => {
      const docRel = path.relative(path.dirname(relPath + '.md'), rp + '.md').replace(/\\/g, '/');
      lines.push(`- [${rp}](${docRel})`);
    });
  }
  // Write to documentation file
  fs.writeFileSync(docPath, lines.join('\n'), 'utf-8');
}

// Main execution
function main() {
  const allFiles = getAllFiles(ROOT);
  allFiles.forEach(f => docForFile(f));
  console.log('Documentation generated under documentation/');
}

main();