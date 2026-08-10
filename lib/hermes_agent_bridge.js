const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const HERMES_CORE_PATH = path.resolve(__dirname, '..', 'hermes_core');

class HermesAgentBridge {
  constructor() {
    this.corePath = HERMES_CORE_PATH;
    this.isCoreAvailable = fs.existsSync(this.corePath);
  }

  getCoreMetadata() {
    if (!this.isCoreAvailable) {
      return { status: 'fallback', provider: 'Nous Research Hermes Agent (Local Fallback)' };
    }

    try {
      const pkgPath = path.join(this.corePath, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      return {
        status: 'active',
        name: pkg.name || 'hermes-agent',
        version: pkg.version || '1.0.0',
        corePath: this.corePath,
        repository: 'https://github.com/nousresearch/hermes-agent'
      };
    } catch (err) {
      return { status: 'error', error: err.message };
    }
  }

  formatCanonicalSystemPrompt(basePrompt, options = {}) {
    const coreMeta = this.getCoreMetadata();
    const soulFile = path.join(this.corePath, 'SOUL.md');
    let soulContent = '';
    if (fs.existsSync(soulFile)) {
      soulContent = fs.readFileSync(soulFile, 'utf8');
    }

    const header = `[NOUS RESEARCH HERMES AGENT CANONICAL ARCHITECTURE — V5.2.0]\n[FRAMEWORK CORE]: ${coreMeta.name || 'hermes-agent'} (${coreMeta.version || '1.0.0'})\n[REPOSITORY]: https://github.com/nousresearch/hermes-agent\n\n`;
    const soulSection = soulContent ? `\n\n### CANONICAL SOUL.md:\n${soulContent}\n` : '';
    return `${header}${basePrompt}${soulSection}`;
  }

  executeAxionPythonTool(toolName, params = {}) {
    const scriptPath = path.join(this.corePath, 'tools', 'axion_toolset.py');
    if (!fs.existsSync(scriptPath)) {
      return { status: 'fallback', toolName };
    }

    try {
      const pyCmd = `python -c "import sys; sys.path.append('${this.corePath.replace(/\\/g, '/')}'); from tools.axion_toolset import axion_toolset_instance; res = getattr(axion_toolset_instance, '${toolName}')(**${JSON.stringify(params)}); print(res)"`;
      const stdout = execSync(pyCmd, { timeout: 8000, encoding: 'utf8' });
      return { status: 'success', output: stdout.trim() };
    } catch (err) {
      return { status: 'error', error: err.message };
    }
  }
}

module.exports = new HermesAgentBridge();
