/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // 支持 ESM 包
    esmExternals: true,
  },
  // 处理外部包的依赖
  transpilePackages: ['crownchronicle-core'],
}

module.exports = nextConfig
