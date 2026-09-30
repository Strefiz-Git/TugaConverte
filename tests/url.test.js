// O URL que o browser pede. Uma linha trocada aqui só aparece quando alguém
// clica em "converter", e aí já é tarde: a conversão simplesmente não acontece.
import test from 'node:test';
import assert from 'node:assert/strict';
import { urlDeJob } from '../public/api.js';

test('sem ajustes, o destino vai sozinho', () => {
  assert.equal(urlDeJob('pdf'), '/api/jobs?to=pdf');
  assert.equal(urlDeJob('jpg', ''), '/api/jobs?to=jpg', 'query vazia é como não haver query');
});

test('com ajustes, vêm depois do destino', () => {
  assert.equal(urlDeJob('jpg', 'qualidade=25'), '/api/jobs?to=jpg&qualidade=25');
});

test('o destino é escapado, porque vai numa query', () => {
  assert.equal(urlDeJob('a b&c=d'), '/api/jobs?to=a%20b%26c%3Dd');
});