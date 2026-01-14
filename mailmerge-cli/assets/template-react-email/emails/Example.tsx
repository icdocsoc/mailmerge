// Compile this to a .jsx in emails-out with npm run build
// Then tell mailmerge to load from emails-out/Example.jsx
// And use the inline images files ./images.json when running send or upload-drafts
import { Button, Html, Img } from "@react-email/components";
import * as React from "react";

// You MUST specify the props the email accepts so that the CLI is populated with them
// so that you can map them to your data source
export const parameters = () => ({ name: "string" });

// Provide your email export
export default function Email(props: { name: string }) {
    return (
        <Html>
            <Button
                href="https://example.com"
                style={{ background: "#000", color: "#fff", padding: "12px 20px" }}
            >
                Click me {props.name}!
            </Button>
            <Img src="cid:animage" alt="image of the sky" width="300" height="300" />;
        </Html>
    );
}
