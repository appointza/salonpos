using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class StockMovementController : ControllerBase
    {
        ILogger<StockMovementController> logger;
        StockMovementService stockmovementService;
        InventoryStockService inventoryStockService;

        public StockMovementController(
            ILogger<StockMovementController> logger,
            StockMovementService stockmovementService,
            InventoryStockService inventoryStockService)
        {
            this.logger = logger;
            this.stockmovementService = stockmovementService;
            this.inventoryStockService = inventoryStockService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<StockMovement>>> Entity()
        {
            ActionRes<StockMovement> result = new ActionRes<StockMovement>()
            {
               item = new StockMovement()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<StockMovement>>>> Select(ActionReq<StockMovementSelectReq> req)
        {
            ActionRes<List<StockMovement>> result = new ActionRes<List<StockMovement>>();

            result.item = await stockmovementService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<StockMovement>>> Insert(ActionReq<StockMovement> req)
        {
            ActionRes<StockMovement> result = new ActionRes<StockMovement>();

            result.item = await stockmovementService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<StockMovement>>> Update(ActionReq<StockMovement> req)
        {
            ActionRes<StockMovement> result = new ActionRes<StockMovement>();

            result.item = await stockmovementService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<StockMovement>>> Save(ActionReq<StockMovement> req)
        {
            ActionRes<StockMovement> result = new ActionRes<StockMovement>();

            if(req.item.id > 0){
                result.item = await stockmovementService.Update(req.item);
            }else{
                result.item = await stockmovementService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<StockMovementDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await stockmovementService.Delete(req.item);

            return Ok(result);
        }

        [HttpPost("Adjust")]
        public async Task<ActionResult<ActionRes<StockAdjustRes>>> Adjust(ActionReq<StockAdjustReq> req)
        {
            ActionRes<StockAdjustRes> result = new ActionRes<StockAdjustRes>();
            result.item = await inventoryStockService.Adjust(req.item);
            return Ok(result);
        }
    }
}
