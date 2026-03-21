#!/usr/bin/env node
import { DevBoostCLI } from './cli.js';
const cli = new DevBoostCLI();
cli.run().catch(console.error);
