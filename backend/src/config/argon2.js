import argon2 from "argon2";

// Decision #3 — measured, not copied from a blog. See tests/bench/ for the
// scripts that produced these numbers.
//
// MEASURED ON HOST (Windows, win32/x64, Node v22.13.0), NOT inside the
// Alpine container — Docker Desktop's engine wasn't reachable from this
// dev environment when this was benchmarked. This is a real gap: host and
// container CPU/memory characteristics differ, sometimes by a lot. Re-run
// `docker compose run --rm backend node tests/bench/argon2-bench.js` and
// `... argon2-concurrency.js` once Docker is reachable, and update the
// numbers below — don't trust this file's comment over an actual rerun.
//
// tests/bench/argon2-bench.js (p=1, t=3, target 250ms):
//   m=122880 KiB (~120 MiB) -> mean 252.3ms   <- lands on target
//
// tests/bench/argon2-concurrency.js (50 concurrent hashes):
//   m=122880 KiB: peak RSS delta ~481MB (default UV_THREADPOOL_SIZE=4, so
//     only ~4 hashes actually run in parallel — peak matches ~4 x 120MiB,
//     not 50 x 120MiB. Still, ~481MB of hashing alone is a lot of headroom
//     to ask of a container with no memory ceiling set, and this app's own
//     baseline (Express, Mongoose, MailHog client, etc.) adds more on top.
//   m=65536 KiB (~64 MiB): peak RSS delta ~257MB — comfortable under the
//     512m limit now set on the backend service in docker-compose.yml,
//     leaving headroom for app baseline overhead.
//
// Chose the safer, lower value per "if it blows up, lower m and say so":
// 120 MiB hit the 250ms target but left too little memory headroom under
// concurrent load for a container with a 512m cap. 64 MiB trades hash time
// (178ms measured, not 250ms) for concurrency safety. Revisit this
// trade-off if the memory limit changes.
export const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 1,
};
