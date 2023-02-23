window.Vue.createApp({
  template: `
  <div style="margin: 0; padding: 0; width: 100%; height: 100vh;">
    <vtk-view>
      <vtk-geometry-representation>
        <vtk-polydata
          :points="[0, 0, 0, 0, 1, 0, 1, 0, 0]"
          :polys="[3, 0, 1, 2]"
        />
      </vtk-geometry-representation>
    </vtk-view>
  </div>
  `,
})
  .use(window.vue_vtk)
  .mount("#app");
