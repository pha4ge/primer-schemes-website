// The catalogue is served straight from the primer-schemes repository on GitHub.
// Flipping to the production repo once its main branch carries the
// v1.0.0-alpha index is a change to these three constants alone.
export const CATALOG_REPO_OWNER = 'pha4ge'; // TODO: 'pha4ge' once main is migrated
export const CATALOG_REPO_NAME = 'primer-schemes'; // TODO: 'primer-schemes' under pha4ge
export const CATALOG_REPO_BRANCH = 'main'; // TODO: 'main'

const RAW_BASE = `https://raw.githubusercontent.com/${CATALOG_REPO_OWNER}/${CATALOG_REPO_NAME}/${CATALOG_REPO_BRANCH}`;

export const CATALOG_INDEX_URL = `${RAW_BASE}/index.json`;

// Base for resolving the relative *_file_url values the index emits when it is
// built without --base-url.
export const SCHEMES_RAW_BASE = `${RAW_BASE}/schemes`;

export const GITHUB_REPO_URL = `https://github.com/${CATALOG_REPO_OWNER}/${CATALOG_REPO_NAME}`;

export const GITHUB_REPO_SCHEMES_BASE = `${GITHUB_REPO_URL}/tree/${CATALOG_REPO_BRANCH}/schemes`;
