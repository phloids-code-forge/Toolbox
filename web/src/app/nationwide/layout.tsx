
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Nationwide | Weather Wars",
    description: "US nationwide weather map.",
};

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
