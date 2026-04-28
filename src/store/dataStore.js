import fs from 'fs';
import path from 'path';

const dataPath = path.resolve('data/state.json');

const baseState = {
  users: {},
  groups: {},
  sessions: {},
};

function ensureFile() {
  if (!fs.existsSync(path.dirname(dataPath))) {
    fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  }
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify(baseState, null, 2));
  }
}

function readState() {
  ensureFile();
  const raw = fs.readFileSync(dataPath, 'utf-8');
  return { ...baseState, ...JSON.parse(raw) };
}

function writeState(nextState) {
  fs.writeFileSync(dataPath, JSON.stringify(nextState, null, 2));
}

export const dataStore = {
  getState() {
    return readState();
  },
  update(mutator) {
    const state = readState();
    const next = mutator(state) || state;
    writeState(next);
    return next;
  },
};
