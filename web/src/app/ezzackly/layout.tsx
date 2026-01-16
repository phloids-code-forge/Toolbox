
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: "ezzackly's Studio",
    description: "Fiber arts tools and virtual garden.",
};

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
