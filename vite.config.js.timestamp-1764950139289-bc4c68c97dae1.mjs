// vite.config.js
import { defineConfig, loadEnv } from "file:///C:/Users/DANTE/Desktop/financial/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/DANTE/Desktop/financial/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const define = {};
  for (const key in env) {
    if (key.startsWith("VITE_") || key.startsWith("REACT_APP_")) {
      define[`import.meta.env.${key}`] = JSON.stringify(env[key]);
    }
  }
  if (env.PAYSTACK_PUBLIC_KEY) {
    define["import.meta.env.PAYSTACK_PUBLIC_KEY"] = JSON.stringify(env.PAYSTACK_PUBLIC_KEY);
  }
  return {
    plugins: [
      react({ jsxRuntime: "automatic" })
    ],
    define,
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          ".js": "jsx"
        }
      }
    },
    server: {
      port: 3e3,
      open: false,
      proxy: {
        "/api": {
          target: "http://localhost:3001",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, "/api"),
          ws: true,
          configure: (proxy, options) => {
            proxy.on("error", (err, req, res) => {
              console.error("[Proxy Error]", err.message);
              res.writeHead(503, { "Content-Type": "application/json" });
              res.end(JSON.stringify({
                success: false,
                error: 'API server unavailable. Make sure "npm run api:dev" is running.',
                details: err.message
              }));
            });
            proxy.on("proxyReq", (proxyReq, req, res) => {
              console.log(`[Proxy] ${req.method} ${req.url}`);
            });
          }
        }
      }
    },
    build: {
      outDir: "dist"
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxEQU5URVxcXFxEZXNrdG9wXFxcXGZpbmFuY2lhbFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcREFOVEVcXFxcRGVza3RvcFxcXFxmaW5hbmNpYWxcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL0RBTlRFL0Rlc2t0b3AvZmluYW5jaWFsL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XG4gIC8vIExvYWQgYWxsIGVudiB2YXJpYWJsZXMgZnJvbSAuZW52IGZpbGVzXG4gIGNvbnN0IGVudiA9IGxvYWRFbnYobW9kZSwgcHJvY2Vzcy5jd2QoKSwgJycpO1xuXG4gIC8vIENyZWF0ZSBhIGRlZmluZSBibG9jayB0byBpbmplY3QgZW52IHZhcmlhYmxlc1xuICBjb25zdCBkZWZpbmUgPSB7fTtcbiAgZm9yIChjb25zdCBrZXkgaW4gZW52KSB7XG4gICAgaWYgKGtleS5zdGFydHNXaXRoKCdWSVRFXycpIHx8IGtleS5zdGFydHNXaXRoKCdSRUFDVF9BUFBfJykpIHtcbiAgICAgIGRlZmluZVtgaW1wb3J0Lm1ldGEuZW52LiR7a2V5fWBdID0gSlNPTi5zdHJpbmdpZnkoZW52W2tleV0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIEV4cGxpY2l0bHkgZXhwb3NlIFBheXN0YWNrIHB1YmxpYyBrZXkgaWYgcHJvdmlkZWQgKGRvIE5PVCBleHBvc2Ugc2VjcmV0cylcbiAgaWYgKGVudi5QQVlTVEFDS19QVUJMSUNfS0VZKSB7XG4gICAgZGVmaW5lWydpbXBvcnQubWV0YS5lbnYuUEFZU1RBQ0tfUFVCTElDX0tFWSddID0gSlNPTi5zdHJpbmdpZnkoZW52LlBBWVNUQUNLX1BVQkxJQ19LRVkpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBwbHVnaW5zOiBbXG4gICAgICByZWFjdCh7IGpzeFJ1bnRpbWU6ICdhdXRvbWF0aWMnIH0pXG4gICAgXSxcbiAgICBkZWZpbmUsXG4gICAgb3B0aW1pemVEZXBzOiB7XG4gICAgICBlc2J1aWxkT3B0aW9uczoge1xuICAgICAgICBsb2FkZXI6IHtcbiAgICAgICAgICAnLmpzJzogJ2pzeCcsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gICAgc2VydmVyOiB7XG4gICAgICBwb3J0OiAzMDAwLFxuICAgICAgb3BlbjogZmFsc2UsXG4gICAgICBwcm94eToge1xuICAgICAgICAnL2FwaSc6IHtcbiAgICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjMwMDEnLFxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXBpLywgJy9hcGknKSxcbiAgICAgICAgICB3czogdHJ1ZSxcbiAgICAgICAgICBjb25maWd1cmU6IChwcm94eSwgb3B0aW9ucykgPT4ge1xuICAgICAgICAgICAgcHJveHkub24oJ2Vycm9yJywgKGVyciwgcmVxLCByZXMpID0+IHtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW1Byb3h5IEVycm9yXScsIGVyci5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg1MDMsIHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTtcbiAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXJyb3I6ICdBUEkgc2VydmVyIHVuYXZhaWxhYmxlLiBNYWtlIHN1cmUgXCJucG0gcnVuIGFwaTpkZXZcIiBpcyBydW5uaW5nLicsXG4gICAgICAgICAgICAgICAgZGV0YWlsczogZXJyLm1lc3NhZ2VcbiAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHByb3h5Lm9uKCdwcm94eVJlcScsIChwcm94eVJlcSwgcmVxLCByZXMpID0+IHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtQcm94eV0gJHtyZXEubWV0aG9kfSAke3JlcS51cmx9YCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIGJ1aWxkOiB7XG4gICAgICBvdXREaXI6ICdkaXN0JyxcbiAgICB9LFxuICB9O1xufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTRSLFNBQVMsY0FBYyxlQUFlO0FBQ2xVLE9BQU8sV0FBVztBQUVsQixJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUV4QyxRQUFNLE1BQU0sUUFBUSxNQUFNLFFBQVEsSUFBSSxHQUFHLEVBQUU7QUFHM0MsUUFBTSxTQUFTLENBQUM7QUFDaEIsYUFBVyxPQUFPLEtBQUs7QUFDckIsUUFBSSxJQUFJLFdBQVcsT0FBTyxLQUFLLElBQUksV0FBVyxZQUFZLEdBQUc7QUFDM0QsYUFBTyxtQkFBbUIsR0FBRyxFQUFFLElBQUksS0FBSyxVQUFVLElBQUksR0FBRyxDQUFDO0FBQUEsSUFDNUQ7QUFBQSxFQUNGO0FBR0EsTUFBSSxJQUFJLHFCQUFxQjtBQUMzQixXQUFPLHFDQUFxQyxJQUFJLEtBQUssVUFBVSxJQUFJLG1CQUFtQjtBQUFBLEVBQ3hGO0FBRUEsU0FBTztBQUFBLElBQ0wsU0FBUztBQUFBLE1BQ1AsTUFBTSxFQUFFLFlBQVksWUFBWSxDQUFDO0FBQUEsSUFDbkM7QUFBQSxJQUNBO0FBQUEsSUFDQSxjQUFjO0FBQUEsTUFDWixnQkFBZ0I7QUFBQSxRQUNkLFFBQVE7QUFBQSxVQUNOLE9BQU87QUFBQSxRQUNUO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxJQUNBLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxRQUNMLFFBQVE7QUFBQSxVQUNOLFFBQVE7QUFBQSxVQUNSLGNBQWM7QUFBQSxVQUNkLFNBQVMsQ0FBQyxTQUFTLEtBQUssUUFBUSxVQUFVLE1BQU07QUFBQSxVQUNoRCxJQUFJO0FBQUEsVUFDSixXQUFXLENBQUMsT0FBTyxZQUFZO0FBQzdCLGtCQUFNLEdBQUcsU0FBUyxDQUFDLEtBQUssS0FBSyxRQUFRO0FBQ25DLHNCQUFRLE1BQU0saUJBQWlCLElBQUksT0FBTztBQUMxQyxrQkFBSSxVQUFVLEtBQUssRUFBRSxnQkFBZ0IsbUJBQW1CLENBQUM7QUFDekQsa0JBQUksSUFBSSxLQUFLLFVBQVU7QUFBQSxnQkFDckIsU0FBUztBQUFBLGdCQUNULE9BQU87QUFBQSxnQkFDUCxTQUFTLElBQUk7QUFBQSxjQUNmLENBQUMsQ0FBQztBQUFBLFlBQ0osQ0FBQztBQUVELGtCQUFNLEdBQUcsWUFBWSxDQUFDLFVBQVUsS0FBSyxRQUFRO0FBQzNDLHNCQUFRLElBQUksV0FBVyxJQUFJLE1BQU0sSUFBSSxJQUFJLEdBQUcsRUFBRTtBQUFBLFlBQ2hELENBQUM7QUFBQSxVQUNIO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsSUFDVjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
