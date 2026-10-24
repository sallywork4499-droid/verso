/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '12mb' },
    // Quay lại một tab vừa xem trong vòng 30 giây thì hiện ngay,
    // không phải chờ server dựng lại trang
    staleTimes: { dynamic: 30, static: 180 },
  },
};
export default nextConfig;
