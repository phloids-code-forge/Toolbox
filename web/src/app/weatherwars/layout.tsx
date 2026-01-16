
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Weather Wars | The Battle for Accuracy",
    description: "Real-time weather source accuracy tracking.",
};

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
