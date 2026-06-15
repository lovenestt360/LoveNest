import { useState } from "react";
import { ReactReader } from "react-reader";

export function EpubReader({ fileUrl }: { fileUrl: string }) {
    const [location, setLocation] = useState<string | number | null>(null);

    return (
        <div className="h-full relative">
            <ReactReader
                url={fileUrl}
                location={location}
                locationChanged={(epubcfi: string) => setLocation(epubcfi)}
            />
        </div>
    );
}
