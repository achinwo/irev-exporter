import Head from "next/head";
import React from "react";

export default function MetaHead() {
  return (
    <>
      <Head>
        <title>iReV</title>
        <meta property="og:title" content="iReV-LP" key="title" />
        <meta
          property="og:description"
          content="This is an iReV portal for Obidents/LP"
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
