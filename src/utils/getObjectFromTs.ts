import { readFileSync } from 'fs';

export async function getObjectFromTs(tsPath: string): Promise<any> {
    const content = readFileSync(tsPath, 'utf8');

    const objectRegex = /const\s+\w+\s*:\s*[^=]+=\s*(\{[\s\S]*?\});/;
    const match = content.match(objectRegex);

    if (!match) {
        throw new Error(`Object declaration not found in: ${tsPath}`);
    }

    try {
        const objectString = match[1];
        return eval(`(${objectString})`);
    } catch (err: any) {
        throw new Error(`Failed to parse object: ${err.message}`);
    }
}
