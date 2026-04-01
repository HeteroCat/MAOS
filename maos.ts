#!/usr/bin/env bun
/**
 * MAOS - Multi-Agent Operating System
 * Main entry point for running multi-agent simulations
 */

import { spawn } from 'child_process';
import { join } from 'path';

const args = process.argv.slice(2);
const command = args[0];

function printBanner() {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   🤖 MAOS - Multi-Agent Operating System                        ║
║                                                                  ║
║   Web-based Multi-Agent Visualization and Orchestration         ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`);
}

function printHelp() {
  console.log(`
Usage: maos <command> [options]

Commands:
  run <task>       Start a multi-agent task
  server           Start the WebSocket server only
  web              Start the web interface only
  dev              Start both server and web in development mode

Examples:
  maos run "重构这个代码库"
  maos run "分析项目结构并找出bug"
  maos dev

Options:
  -h, --help       Show this help message
  -v, --version    Show version
`);
}

function startServer() {
  console.log('🚀 Starting MAOS server...');
  const server = spawn('bun', ['run', 'server:dev'], {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
  return server;
}

function startWeb() {
  console.log('🌐 Starting MAOS web interface...');
  const web = spawn('bun', ['run', 'web:dev'], {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
  return web;
}

async function runTask(taskDescription: string) {
  if (!taskDescription) {
    console.error('❌ Error: Task description is required');
    console.log('\nUsage: maos run "<task description>"');
    process.exit(1);
  }

  printBanner();
  console.log(`📋 Task: ${taskDescription}\n`);

  // Start server
  const server = startServer();

  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Start web interface
  const web = startWeb();

  // Wait for web to be ready
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('\n✅ MAOS is running!');
  console.log('📱 Open http://localhost:3000 to view the visualization');
  console.log('📝 Enter your task in the web interface\n');

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down MAOS...');
    server.kill();
    web.kill();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    server.kill();
    web.kill();
    process.exit(0);
  });
}

async function main() {
  if (args.includes('-h') || args.includes('--help')) {
    printHelp();
    return;
  }

  if (args.includes('-v') || args.includes('--version')) {
    console.log('MAOS v1.0.0');
    return;
  }

  switch (command) {
    case 'run':
      await runTask(args[1]);
      break;
    case 'server':
      printBanner();
      startServer();
      break;
    case 'web':
      printBanner();
      startWeb();
      break;
    case 'dev':
      printBanner();
      await runTask('');
      break;
    default:
      printBanner();
      printHelp();
      break;
  }
}

main().catch(console.error);
