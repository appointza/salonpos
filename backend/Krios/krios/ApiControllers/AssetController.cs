using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class AssetController : ControllerBase
    {
        ILogger<AssetController> logger;
        AssetService assetService;

        public AssetController(ILogger<AssetController> logger, AssetService assetService)
        {
            this.logger = logger;
            this.assetService = assetService;
        }

        [HttpGet("Entity")]
        public ActionResult<ActionRes<Asset>> Entity()
        {
            return Ok(new ActionRes<Asset> { item = new Asset() });
        }

        [HttpGet("File/{id:long}")]
        public async Task<IActionResult> GetFile(long id)
        {
            var asset = await assetService.GetById(id);
            if (asset == null) return NotFound();
            var decoded = AssetService.TryDecodeImage(asset.content);
            if (decoded == null) return NotFound();
            return File(decoded.Value.bytes, decoded.Value.mime);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<Asset>>>> Select(ActionReq<AssetSelectReq> req)
        {
            var result = new ActionRes<List<Asset>>();
            result.item = await assetService.Select(req.item);
            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<Asset>>> Insert(ActionReq<Asset> req)
        {
            var result = new ActionRes<Asset>();
            result.item = await assetService.Insert(req.item);
            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<Asset>>> Update(ActionReq<Asset> req)
        {
            var result = new ActionRes<Asset>();
            result.item = await assetService.Update(req.item);
            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<Asset>>> Save(ActionReq<Asset> req)
        {
            var result = new ActionRes<Asset>();
            if (req.item.id > 0)
                result.item = await assetService.Update(req.item);
            else
                result.item = await assetService.Insert(req.item);
            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<AssetDeleteReq> req)
        {
            var result = new ActionRes<bool>();
            result.item = await assetService.Delete(req.item);
            return Ok(result);
        }
    }
}
