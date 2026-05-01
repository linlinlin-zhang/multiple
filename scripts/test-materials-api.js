import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("materials API handler", () => {
  let mod;
  it("module exports handleListMaterials, handleCreateMaterial, handleDeleteMaterial", async () => {
    mod = await import("../src/api/materials.js");
    assert.equal(typeof mod.handleListMaterials, "function", "handleListMaterials should be a function");
    assert.equal(typeof mod.handleCreateMaterial, "function", "handleCreateMaterial should be a function");
    assert.equal(typeof mod.handleDeleteMaterial, "function", "handleDeleteMaterial should be a function");
  });

  it("handleListMaterials accepts (query, res) signature", () => {
    assert.equal(mod.handleListMaterials.length, 2, "handleListMaterials should accept 2 params");
  });

  it("handleCreateMaterial accepts (body, res) signature", () => {
    assert.equal(mod.handleCreateMaterial.length, 2, "handleCreateMaterial should accept 2 params");
  });

  it("handleDeleteMaterial accepts (materialId, res) signature", () => {
    assert.equal(mod.handleDeleteMaterial.length, 2, "handleDeleteMaterial should accept 2 params");
  });
});
