import chalk from 'chalk'
import { runBuildCNAME } from './build-cname'

export const runBuild = async () => {
  try {
    runBuildCNAME()
  } catch (error) {
    process.exit(1)
  }
}

runBuild()
