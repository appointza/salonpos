using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class FeedbackController : ControllerBase
    {
        ILogger<FeedbackController> logger;
        FeedbackService feedbackService;

        public FeedbackController(ILogger<FeedbackController> logger, FeedbackService feedbackService)
        {
            this.logger = logger;
            this.feedbackService = feedbackService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<Feedback>>> Entity()
        {
            ActionRes<Feedback> result = new ActionRes<Feedback>()
            {
               item = new Feedback()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<Feedback>>>> Select(ActionReq<FeedbackSelectReq> req)
        {
            ActionRes<List<Feedback>> result = new ActionRes<List<Feedback>>();

            result.item = await feedbackService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<Feedback>>> Insert(ActionReq<Feedback> req)
        {
            ActionRes<Feedback> result = new ActionRes<Feedback>();

            result.item = await feedbackService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<Feedback>>> Update(ActionReq<Feedback> req)
        {
            ActionRes<Feedback> result = new ActionRes<Feedback>();

            result.item = await feedbackService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<Feedback>>> Save(ActionReq<Feedback> req)
        {
            ActionRes<Feedback> result = new ActionRes<Feedback>();

            if(req.item.id > 0){
                result.item = await feedbackService.Update(req.item);
            }else{
                result.item = await feedbackService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<FeedbackDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await feedbackService.Delete(req.item);

            return Ok(result);
        }
    }
}
