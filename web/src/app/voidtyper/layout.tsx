import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Void Typer | phloid',
    description: 'Type your worries. Watch them disappear. No history. No trace. Just release.',
};

export default function VoidTyperLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
