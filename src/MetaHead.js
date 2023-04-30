import Head from "next/head";
import React from "react";

export default function MetaHead() {
  return (
    <>
      <Head>
        <title>iReV</title>
        <meta property="og:title" content="iReV" key="title" />
        <meta
          property="og:description"
          content="Unoffical portal for efficient browsing and transcription of INEC election data"
          key="description"
        />
        <meta
          property="og:url"
          content="https://irev-exporter.vercel.app/"
          key="url"
        />
        <meta
          property="og:image"
          content="https://irev-exporter.vercel.app/og-image.png"
          key="image"
        />
      </Head>
    </>
  );
}
