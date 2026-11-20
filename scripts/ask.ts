/**
 * Uji cepat dari terminal.
 * Jalankan: npm run ask -- "mau bikin surat buat bank"
 */
import { ask } from "../lib/rag";

async function main() {
  const question = process.argv.slice(2).join(" ");
  if (!question) {
    console.error('Contoh: npm run ask -- "syarat bikin KTP baru"');
    process.exit(1);
  }
  const res = await ask(question);
  console.log(res.answer);
  console.log("\nTerjawab:", res.answered);
  for (const s of res.sources) console.log(`- ${s.service} (${s.similarity.toFixed(2)})`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
