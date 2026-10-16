// Changelog entries contain only the reviewed summary. Release preparation
// happens before code reaches the published repository, so commit hashes and
// pull-request links from that history would not resolve for readers.
module.exports = {
  async getReleaseLine(changeset) {
    const [first, ...rest] = changeset.summary.trim().split('\n');
    const continuation = rest.map(line => (line ? `  ${line}` : line)).join('\n');
    return `\n- ${first}${continuation ? `\n${continuation}` : ''}`;
  },
  // Platforms don't depend on each other through Changesets; nothing to report.
  async getDependencyReleaseLine() {
    return '';
  },
};
