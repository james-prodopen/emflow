'use server';

import { writeFile, readFile, readdir, unlink, rename, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

const FLOWS_DIR = process.env.SAVED_FLOWS_DIR
  ? join(process.env.SAVED_FLOWS_DIR)
  : join(process.cwd(), 'flows');

async function ensureFlowsDir() {
  if (!existsSync(FLOWS_DIR)) {
    await mkdir(FLOWS_DIR, { recursive: true });
  }
}

export async function listFlows() {
  await ensureFlowsDir();

  try {
    const files = await readdir(FLOWS_DIR);
    const flowFiles = files.filter(f => f.endsWith('.json'));

    return flowFiles.map(f => f.replace('.json', ''));
  } catch {
    return [];
  }
}

export async function createFlow(name: string) {
  await ensureFlowsDir();

  const filePath = join(FLOWS_DIR, `${name}.json`);

  if (existsSync(filePath)) {
    return { success: false, error: 'Flow with this name already exists' };
  }

  const flowData = {
    nodes: [],
    edges: [],
  };

  await writeFile(filePath, JSON.stringify(flowData, null, 2), 'utf-8');
  return { success: true };
}

export async function deleteFlow(name: string) {
  const filePath = join(FLOWS_DIR, `${name}.json`);

  if (!existsSync(filePath)) {
    return { success: false, error: 'Flow not found' };
  }

  await unlink(filePath);
  return { success: true };
}

export async function renameFlow(oldName: string, newName: string) {
  const oldPath = join(FLOWS_DIR, `${oldName}.json`);
  const newPath = join(FLOWS_DIR, `${newName}.json`);

  if (!existsSync(oldPath)) {
    return { success: false, error: 'Flow not found' };
  }

  if (existsSync(newPath)) {
    return { success: false, error: 'Flow with new name already exists' };
  }

  await rename(oldPath, newPath);
  return { success: true };
}

export async function saveFlow(flowName: string, data: string) {
  await ensureFlowsDir();

  const filePath = join(FLOWS_DIR, `${flowName}.json`);
  await writeFile(filePath, data, 'utf-8');
  return { success: true };
}

export async function loadFlow(flowName: string) {
  const filePath = join(FLOWS_DIR, `${flowName}.json`);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const data = await readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

export async function executeCommand(command: string) {
  try {
    const { stdout, stderr } = await execPromise(command, {
      cwd: process.cwd(),
    });

    return {
      success: true,
      stdout,
      stderr,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      stdout: error.stdout || '',
      stderr: error.stderr || '',
    };
  }
}
