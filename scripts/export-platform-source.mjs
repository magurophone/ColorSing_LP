import path from 'node:path'
import {
  capturePlatformSource,
  readDashboardConfig,
  writeSourceArtifact,
} from './lib/platform-source.mjs'

function readArgument(name, fallback = '') {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] || fallback : fallback
}

const configPath = path.resolve(readArgument('--config', 'public/customer/config.js'))
const configUrl = readArgument('--config-url')
const outputPath = path.resolve(readArgument('--output', '.local/lp-source-snapshot.json'))
const config = await readDashboardConfig({ configPath, configUrl })
const artifact = await capturePlatformSource(config)
await writeSourceArtifact(outputPath, artifact)
console.log(`LP_SOURCE_SNAPSHOT=OK rows=${Object.values(artifact.source).reduce((sum, rows) => sum + rows.length, 0)} output=${outputPath}`)
