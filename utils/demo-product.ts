import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const runFile = promisify(execFile);

export async function setDemoProductStock(sku: string, stock: number): Promise<void> {
    await runFile(
        process.execPath,
        [
            'scripts/demo-product.mjs',
            '--sku',
            sku,
            '--stock',
            String(stock),
        ],
        {
            cwd: resolve(__dirname, '../../application'),
            windowsHide: true,
            timeout: 10_000,
        },
    );
}