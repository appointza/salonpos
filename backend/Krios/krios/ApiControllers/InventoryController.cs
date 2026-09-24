using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class InventoryController : ControllerBase
    {
        ILogger<InventoryController> logger;
        InventoryService inventoryService;
        InventoryStockService inventoryStockService;

        public InventoryController(
            ILogger<InventoryController> logger,
            InventoryService inventoryService,
            InventoryStockService inventoryStockService)
        {
            this.logger = logger;
            this.inventoryService = inventoryService;
            this.inventoryStockService = inventoryStockService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<Inventory>>> Entity()
        {
            ActionRes<Inventory> result = new ActionRes<Inventory>()
            {
               item = new Inventory()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<Inventory>>>> Select(ActionReq<InventorySelectReq> req)
        {
            ActionRes<List<Inventory>> result = new ActionRes<List<Inventory>>();

            result.item = await inventoryService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<Inventory>>> Insert(ActionReq<Inventory> req)
        {
            ActionRes<Inventory> result = new ActionRes<Inventory>();

            result.item = await inventoryService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<Inventory>>> Update(ActionReq<Inventory> req)
        {
            ActionRes<Inventory> result = new ActionRes<Inventory>();

            result.item = await inventoryService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<Inventory>>> Save(ActionReq<Inventory> req)
        {
            ActionRes<Inventory> result = new ActionRes<Inventory>();

            if(req.item.id > 0){
                result.item = await inventoryService.Update(req.item);
            }else{
                result.item = await inventoryService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<InventoryDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await inventoryService.Delete(req.item);

            return Ok(result);
        }

        [HttpPost("Remaining")]
        public async Task<ActionResult<ActionRes<InventoryRemainingRes>>> Remaining(ActionReq<InventoryRemainingReq> req)
        {
            ActionRes<InventoryRemainingRes> result = new ActionRes<InventoryRemainingRes>();
            result.item = await inventoryStockService.GetRemaining(req.item);
            return Ok(result);
        }

        [HttpPost("CheckAvailability")]
        public async Task<ActionResult<ActionRes<InventoryCheckAvailabilityRes>>> CheckAvailability(ActionReq<InventoryCheckAvailabilityReq> req)
        {
            ActionRes<InventoryCheckAvailabilityRes> result = new ActionRes<InventoryCheckAvailabilityRes>();
            result.item = await inventoryStockService.CheckAvailability(req.item);
            return Ok(result);
        }
    }
}
