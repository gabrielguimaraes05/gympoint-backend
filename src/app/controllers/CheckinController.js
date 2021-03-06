import * as Yup from 'yup';
import { Op } from 'sequelize';
import { startOfDay, startOfWeek, endOfWeek } from 'date-fns';
import Checkin from '../schemas/Checkin';
import Enrollment from '../models/Enrollment';

class CheckinController {
  async index(req, res) {
    const schema = Yup.object().shape({
      id: Yup.number()
        .integer()
        .positive()
        .required(),
    });

    if (!(await schema.isValid(req.params))) {
      return res.status(400).json({
        error: 'Validation fails',
      });
    }
    const { id } = req.params;

    /**
     * Check if user is enrolled
     */
    const isEnrolled = await Enrollment.findOne({
      where: {
        student_id: id,
        canceled_at: null,
        end_date: {
          [Op.gte]: new Date(),
        },
      },
    });
    if (!isEnrolled)
      return res.status(400).json({ error: 'Student is not enrolled' });

    const checkins = await Checkin.find({
      user: id,
    })
      .sort({ createdAt: 'desc' })
      .limit(20);
    return res.json(checkins);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      id: Yup.number()
        .integer()
        .positive()
        .required(),
    });

    if (!(await schema.isValid(req.params))) {
      return res.status(400).json({
        error: 'Validation fails',
      });
    }
    const { id } = req.params;

    /**
     * Check if user is enrolled
     */
    const isEnrolled = await Enrollment.findOne({
      where: {
        student_id: id,
        canceled_at: null,
        end_date: {
          [Op.gte]: new Date(),
        },
      },
    });
    if (!isEnrolled)
      return res.status(400).json({ error: 'Student is not enrolled' });

    /**
     * Check if user already checked in today
     */
    const alreadyCheckedInToday =
      (await Checkin.count({
        user: id,
        createdAt: {
          $gte: startOfDay(new Date()),
        },
      })) >= 1;

    if (alreadyCheckedInToday)
      return res.status(400).json({ error: 'Already checked in today' });

    /**
     * Check if user already has 5 checkins in this week
     */
    const checkins = await Checkin.count({
      user: id,
      createdAt: {
        $gte: startOfWeek(new Date()),
        $lte: endOfWeek(new Date()),
      },
    });
    if (checkins >= 5)
      return res.status(400).json({ error: 'Checkins limit reached' });

    const { user, createdAt } = await Checkin.create({
      user: id,
    });
    return res.json({ user, createdAt });
  }
}

export default new CheckinController();
