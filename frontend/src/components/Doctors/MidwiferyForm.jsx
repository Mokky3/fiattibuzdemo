import React, { useState, useRef } from 'react';

const MidwiferyForm = () => {
  const formRef = useRef(null);
  // Form state
  const [formData, setFormData] = useState({});

  // Handle input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const scrollPos = formRef.current?.scrollTop;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Restore scroll position after state update
    if (formRef.current) {
      setTimeout(() => {
        formRef.current.scrollTop = scrollPos;
      }, 0);
    }
  };

  // Label and input field component
  const FormField = ({ label, name, type = 'text', placeholder = '', options = [], width = 'full' }) => {
    const widthClass = {
      'full': 'w-full',
      'half': 'w-1/2',
      '1/3': 'w-1/3',
      '2/3': 'w-2/3',
      '1/4': 'w-1/4',
      '3/4': 'w-3/4',
    }[width];

    return (
      <div className={`${widthClass} px-2 mb-3`}>
        <label className="block text-gray-600 text-xs mb-1">{label}</label>
        {type === 'select' ? (
          <select 
            name={name} 
            value={formData[name] || ''} 
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          >
            <option value="">Select an option</option>
            {options.map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            name={name}
            value={formData[name] || ''}
            onChange={handleChange}
            placeholder={placeholder}
            rows="3"
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3] resize-none"
          ></textarea>
        ) : type === 'radio' ? (
          <div className="flex space-x-4">
            {options.map((option, index) => (
              <label key={index} className="flex items-center">
                <input
                  type="radio"
                  name={name}
                  value={option}
                  checked={formData[name] === option}
                  onChange={handleChange}
                  className="mr-1 text-[#5ACCC3] focus:ring-[#5ACCC3]"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        ) : type === 'checkbox' ? (
          <label className="flex items-center">
            <input
              type="checkbox"
              name={name}
              checked={formData[name] || false}
              onChange={handleChange}
              className="mr-1 text-[#5ACCC3] focus:ring-[#5ACCC3]"
            />
            <span className="text-sm">{placeholder}</span>
          </label>
        ) : (
          <input
            type={type}
            name={name}
            value={formData[name] || ''}
            onChange={handleChange}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#5ACCC3] focus:border-[#5ACCC3]"
          />
        )}
      </div>
    );
  };

  // Section component with title
  const FormSection = ({ title, children, bgColor = 'bg-white' }) => (
    <div className={`mb-4 ${bgColor}`}>
      {title && (
        <div className="px-4 py-2 bg-gray-100 border-b border-gray-200">
          <h3 className="font-medium text-sm text-gray-700">{title}</h3>
        </div>
      )}
      <div className="p-4 flex flex-wrap">{children}</div>
    </div>
  );

  return (
    <div className="fixed-form-container">
      <form 
        ref={formRef}
        className="text-gray-700 overflow-y-auto max-h-[70vh]" 
        style={{ 
          position: 'relative',
          contain: 'paint',
          willChange: 'transform'
        }}
      >
        <FormSection title="Информация о семье">
          {/* Mother's Information */}
          <div className="w-full mb-4">
            <h4 className="text-sm font-medium mb-2">Мать</h4>
            <div className="flex flex-wrap gap-2">
              <FormField label="Фамилия" name="mother_lastname" width="1/3" />
              <FormField label="Имя" name="mother_firstname" width="1/3" />
              <FormField label="Отчество" name="mother_middlename" width="1/3" />
              <FormField label="неизвестно" name="mother_unknown" type="checkbox" width="1/3" />
            </div>
            
            <div className="flex flex-wrap gap-2 mt-2">
              <FormField label="Место работы" name="mother_workplace" width="1/3" />
              <FormField label="Должность" name="mother_position" width="1/3" />
              <FormField label="Образование" name="mother_education" type="select" width="1/3" 
                options={['Высшее', 'Среднее', 'Среднее специальное']} />
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              <FormField label="хронические заболевания" name="mother_chronic_diseases" type="select" width="1/2" />
              <FormField label="наследственные заболевания" name="mother_hereditary_diseases" type="select" width="1/2" />
            </div>

            <FormField label="развитие болезни в других детях" name="mother_children_diseases" />
            <FormField label="дополнительно" name="mother_additional_info" type="textarea" />
          </div>

          {/* Father's Information */}
          <div className="w-full mb-4">
            <h4 className="text-sm font-medium mb-2">Отец</h4>
            <div className="flex flex-wrap gap-2">
              <FormField label="Фамилия" name="father_lastname" width="1/3" />
              <FormField label="Имя" name="father_firstname" width="1/3" />
              <FormField label="Отчество" name="father_middlename" width="1/3" />
              <FormField label="неизвестно" name="father_unknown" type="checkbox" width="1/3" />
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              <FormField label="Место работы" name="father_workplace" width="1/3" />
              <FormField label="Должность" name="father_position" width="1/3" />
              <FormField label="Образование" name="father_education" type="select" width="1/3"
                options={['Высшее', 'Среднее', 'Среднее специальное']} />
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              <FormField label="хронические заболевания" name="father_chronic_diseases" type="select" width="1/2" />
              <FormField label="наследственные заболевания" name="father_hereditary_diseases" type="select" width="1/2" />
            </div>

            <FormField label="развитие болезни в других детях" name="father_children_diseases" />
            <FormField label="дополнительно" name="father_additional_info" type="textarea" />
          </div>

          {/* Child Information */}
          <div className="w-full mb-4">
            <h4 className="text-sm font-medium mb-2">Ребенок 1</h4>
            <div className="flex flex-wrap gap-2">
              <FormField label="хронические заболевания других сожителей" name="household_chronic_diseases" type="select" width="1/3" />
              <FormField label="Семейное обстоятельство" name="family_circumstances" type="select" width="1/3" />
              <FormField label="Семейный доход" name="family_income" width="1/3" />
            </div>
          </div>
        </FormSection>

        <FormSection title="Информация о диагнозах">
          <div className="w-full">
            <div className="flex flex-wrap gap-2">
              <FormField label="конечный диагноз" name="final_diagnosis" width="1/3" />
              <FormField label="направленное мед учреждение" name="referred_medical_facility" type="select" width="1/3" />
              <FormField label="даты" name="diagnosis_dates" width="1/3" />
            </div>
          </div>
        </FormSection>

        <FormSection title="Первый патронаж до родов">
          <div className="w-full">
            <div className="flex flex-wrap gap-2">
              <FormField label="Срок родов" name="due_date" width="1/4" />
              <FormField label="№ беременности" name="pregnancy_number" width="1/4" />
              <FormField label="№ предыдущих беременностей" name="previous_pregnancies" width="1/4" />
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              <FormField label="№детей в семье" name="children_in_family" width="1/4" />
              <FormField label="Из них роды" name="successful_births" width="1/4" />
              <FormField label="Кесерево" name="c_sections" width="1/4" />
              <FormField label="Выкидыш" name="miscarriages" width="1/4" />
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              <FormField label="№детей погибших из-за болезней" name="deceased_children" width="1/3" />
              <FormField label="Возраст" name="mother_age" width="1/3" />
              <FormField label="№детей в инвалидов с рождения" name="disabled_children" width="1/3" />
            </div>

            <FormField label="№течения родов в этой беременности" name="current_pregnancy_complications" />
          </div>

          <div className="w-full mt-4">
            <h4 className="text-sm font-medium mb-2">Психологическая атмосфера в семье</h4>
            <FormField label="Психологическая атмосфера" name="psychological_atmosphere" type="select" />
          </div>

          <div className="w-full mt-4">
            <div className="flex flex-wrap gap-4">
              <FormField label="Употребление алкоголя и наркотиков в семье" name="substance_abuse" type="radio" options={['да', 'нет']} />
              <FormField label="Употребление сигарет, никотина в семье" name="smoking" type="radio" options={['да', 'нет']} />
              <FormField label="Физическая активность матери" name="mother_physical_activity" type="radio" options={['да', 'нет']} />
              <FormField label="Санитарный этикет семьи" name="family_hygiene" type="radio" options={['низко', 'нормально']} />
            </div>
          </div>

          <div className="w-full mt-4">
            <div className="flex flex-wrap gap-2">
              <FormField label="Хроническо соматические заболевания" name="chronic_somatic_diseases" type="select" width="1/2" />
              <FormField label="Экстрагенитальные заболевания" name="extragenital_diseases" type="select" width="1/2" />
            </div>
          </div>

          <div className="w-full mt-4">
            <FormField label="Следы беременности" name="pregnancy_signs" type="select" />
            <FormField label="УЗИ (в сроке беременности)" name="ultrasound_results" type="select" />
            <FormField label="Выявленные патологии" name="identified_pathologies" type="select" />
            <FormField label="Вывод" name="conclusion" />
          </div>

          <div className="w-full mt-4">
            <FormField label="7 НУЖДАЮЩИХСЯ в немедленном медицинском осмотре симптомы" name="urgent_symptoms" type="select" />
            <FormField label="При опасности, кто в угрозе" name="at_risk_individuals" type="select" />
          </div>

          <div className="w-full mt-4">
            <h4 className="text-sm font-medium mb-2">Рекомендации:</h4>
            <div className="flex flex-col gap-2">
              <FormField label="Отдых и оптимальная физическая активность" name="rest_and_activity" type="checkbox" />
              <FormField label="Придерживаться оптимального питания" name="optimal_nutrition" type="checkbox" />
              <FormField label="Принимать профилактические медикаменты" name="preventive_medications" type="checkbox" />
              <FormField label="Профилактика инфекционных болезней" name="infection_prevention" type="checkbox" />
              <FormField label="Соблюдать гигиену и убираться дома" name="hygiene_maintenance" type="checkbox" />
              <FormField label="Отказ от курения/алкоголя/наркотических средств" name="substance_abstinence" type="checkbox" />
            </div>
            <FormField label="дополнительно" name="additional_recommendations" type="textarea" />
          </div>
        </FormSection>

        <FormSection title="Второй патронаж до родов">
          <div className="w-full">
            <FormField label="Предположительное место родов" name="expected_birth_place" type="select" />
            <FormField label="Осложнения при беременности" name="pregnancy_complications" type="radio" options={['да', 'нет']} />
            <FormField label="7 НУЖДАЮЩИХСЯ в немедленном медицинском осмотре симптомы" name="urgent_symptoms_second" type="select" />
          </div>

          <div className="w-full mt-4">
            <h4 className="text-sm font-medium mb-2">Приготовленные условия для новорожденного:</h4>
            <div className="flex flex-col gap-2">
              <FormField label="Место" name="baby_place_ready" type="checkbox" />
              <FormField label="кровать" name="baby_bed_ready" type="checkbox" />
              <FormField label="одежда" name="baby_clothes_ready" type="checkbox" />
              <FormField label="место для ухода" name="baby_care_place_ready" type="checkbox" />
            </div>
          </div>

          <div className="w-full mt-4">
            <h4 className="text-sm font-medium mb-2">Рекомендации:</h4>
            <div className="flex flex-col gap-2">
              <FormField label="Придерживаться оптимального питания и физическая активность" name="nutrition_activity_recommendations" type="checkbox" />
              <FormField label='Призывать в комнату "здоровый ребенок" для курса по кормление грудью и ухода над ребенком' name="breastfeeding_course" type="checkbox" />
              <FormField label="Подготовить уголок новорожденного и одежды для родов" name="prepare_baby_corner" type="checkbox" />
            </div>
          </div>
        </FormSection>

        <FormSection title="КОНТРОЛЬНЫЙ ЛИСТ ПО НАВЫКАМ ГРУДНОГО ВСКАРМЛИВАНИЯ: ПОДГОТОВКА БЕРЕМЕННЫХ ЖЕНЩИН К РОДАМ">
          <div className="w-full">
            <h4 className="text-sm font-medium mb-2">Были обсуждены следующие:</h4>
            <div className="flex flex-col gap-2">
              {[
                'Польза грудного вскармливания для ребенка',
                'Польза грудного вскармливания для матери',
                'Грудное вскармливание без исключения в течение первых 6 месяцев жизни',
                'Раннее прикладывание к груди и важность контакта кожа к коже',
                'Положение перед грудью и автономность правильного размещения на груди',
                'Мать и ребенок должны быть вместе',
                'Грудное вскармливание по запросу',
                'Отказ от соски',
                'Помощь медицинского персонала'
              ].map((item, index) => (
                <FormField key={index} label={item} name={`breastfeeding_topic_${index}`} type="checkbox" />
              ))}
            </div>
          </div>
        </FormSection>

        <FormSection title="Патронаж после родов">
          <div className="w-full">
            <h4 className="text-sm font-medium mb-2">Практика родильных домов по поддержке грудного вскармливания:</h4>
            <div className="flex flex-wrap gap-2">
              <FormField label="Раннее прикладывание к груди в родильном доме" name="early_breastfeeding" type="radio" options={['да', 'нет']} />
              <FormField label="Мать и ребенок вместе" name="mother_baby_together" type="radio" options={['да', 'нет']} />
            </div>

            <div className="w-full mt-4">
              <h4 className="text-sm font-medium mb-2">Характер кормления на момент выписка:</h4>
              <div className="flex flex-col gap-2">
                <FormField label="Грудное молоко" name="breast_milk" type="checkbox" />
                <FormField label="Без исключения с грудным молоком" name="exclusive_breastfeeding" type="checkbox" />
                <FormField label="Искусственно" name="artificial_feeding" type="checkbox" />
                <FormField label="Из бутылки" name="bottle_feeding" type="checkbox" />
              </div>
            </div>

            <div className="w-full mt-4">
              <h4 className="text-sm font-medium mb-2">Следующие были обсуждены:</h4>
              <div className="flex flex-col gap-2">
                <FormField label="Важность того, чтобы мать и ребенок были вместе" name="importance_togetherness" type="checkbox" />
                <FormField label="Грудное вскармливание по запросу" name="feeding_on_demand" type="checkbox" />
                <FormField label="Отказ от соски" name="no_pacifier" type="checkbox" />
                <FormField label="Как обеспечить достаточное количество молока" name="milk_supply" type="checkbox" />
                <FormField label="Предотвратите растрескивание присосок" name="prevent_nipple_cracks" type="checkbox" />
                <FormField label="Профилактика мастита и онемения молочных желез" name="mastitis_prevention" type="checkbox" />
                <FormField label="Дальнейшая помощь медицинского персонала" name="further_medical_help" type="checkbox" />
              </div>
            </div>

            <div className="w-full mt-4">
              <h4 className="text-sm font-medium mb-2">Следующие были обсуждены:</h4>
              <div className="flex flex-col gap-2">
                <FormField label="Случаи грудного вскармливания" name="breastfeeding_cases" type="checkbox" />
                <FormField label="Состояние молочных желез" name="breast_condition" type="checkbox" />
                <FormField label="Доение груди вручную" name="manual_expression" type="checkbox" />
              </div>
            </div>

            <div className="w-full mt-4">
              <h4 className="text-sm font-medium mb-2">Следующие были обсуждены:</h4>
              <div className="flex flex-wrap gap-2">
                <FormField label="Письменный материал предоставлен" name="written_material_provided" type="radio" options={['да', 'нет']} />
                <FormField label="Какое" name="material_description" />
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection title="КОНТРОЛЬНЫЙ СПИСОК ПО ОЦЕНКЕ ГРУДНОГО ВСКАРМЛЕНИЯ В ФОП/ОВП/СЕМЕЙНОЙ ПОЛИКЛИНИКЕ">
          <div className="w-full">
            <div className="flex flex-wrap gap-2">
              <FormField label="Раннее грудное вскармливание в родильном зале" name="early_breastfeeding_ward" type="radio" options={['да', 'нет']} />
              <FormField label="Мать и ребенок находились вместе в роддоме" name="mother_baby_together_hospital" type="radio" options={['да', 'нет']} />
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <FormField label="Продолжительность грудного вскармливания" name="breastfeeding_duration" />
              <FormField label="Продолжительность исключительно грудного вскармливания" name="exclusive_breastfeeding_duration" />
              <FormField label="Возраст при введении прикорма" name="complementary_feeding_age" />
            </div>

            <div className="w-full mt-4">
              <h4 className="text-sm font-medium mb-2">КОРМЛЕНИЕ ГРУДНЫМ МОЛОКОМ:</h4>
              {[
                'Род-дом', '1й патронаж', '1й месяц', '2й месяц', '3й месяц', '4й месяц',
                '5й месяц', '6й месяц', '7й месяц', '8й месяц', '9й месяц', '10й месяц',
                '11й месяц', '12й месяц'
              ].map((period, index) => (
                <FormField key={index} label={period} name={`breastfeeding_period_${index}`} type="checkbox" />
              ))}
              <FormField label="2 год" name="breastfeeding_2nd_year" type="select" />
              <FormField label="3 год" name="breastfeeding_3rd_year" type="select" />
            </div>

            <div className="w-full mt-4">
              <h4 className="text-sm font-medium mb-2">КОРМЛЕНИЕ ГРУДНЫМ МОЛОКОМ БЕЗ ИСКЛЮЧЕНИЯ:</h4>
              {[
                'Род-дом', '1й патронаж', '1й месяц', '2й месяц', '3й месяц', '4й месяц',
                '5й месяц', '6й месяц'
              ].map((period, index) => (
                <FormField key={index} label={period} name={`exclusive_breastfeeding_period_${index}`} type="checkbox" />
              ))}
            </div>

            <div className="w-full mt-4">
              <h4 className="text-sm font-medium mb-2">КОНТРОЛЬ ВЕСА:</h4>
              {[
                'При рождении', '15 дней', '1й месяц', '2й месяц', '3й месяц',
                '4й месяц', '5й месяц', '6й месяц'
              ].map((period, index) => (
                <FormField key={index} label={period} name={`weight_control_${period}`} />
              ))}
            </div>

            <div className="w-full mt-4">
              <h4 className="text-sm font-medium mb-2">ЗАКЛЮЧЕНИЕ ВРАЧА О ПИТАНИИ РЕБЕНКА:</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h5 className="text-xs font-medium mb-1">Кормление:</h5>
                  <FormField label="Грудью" name="feeding_breast" />
                  <FormField label="Смешанное" name="feeding_mixed" />
                  <FormField label="Искусственное" name="feeding_artificial" />
                </div>
                <div>
                  <FormField label="Причина перевода на смешанное" name="reason_mixed_feeding" type="select" />
                </div>
                <div>
                  <FormField label="Причина перевода на искусственное" name="reason_artificial_feeding" type="select" />
                </div>
              </div>
            </div>

            <div className="w-full mt-4">
              <h4 className="text-sm font-medium mb-2">Добавление еды:</h4>
              <div className="flex flex-wrap gap-2">
                <FormField label="Дата введения дополнительного питания" name="complementary_feeding_date" />
                <FormField label="Возраст" name="age_at_complementary_feeding" />
              </div>
            </div>

            <div className="w-full mt-4">
              <h4 className="text-sm font-medium mb-2">Антропометрические показатели на первом году жизни:</h4>
              {[
                '1й месяц', '2й месяц', '3й месяц', '4й месяц', '5й месяц', '6й месяц',
                '7й месяц', '8й месяц', '9й месяц', '10й месяц', '11й месяц', '12й месяц'
              ].map((month, index) => (
                <div key={index} className="flex flex-wrap gap-2 mb-2">
                  <FormField label={month} name={`anthropometry_${index}_weight`} width="1/4" />
                  <div className="w-1/4 px-2">
                    <span className="text-sm">+200гр</span>
                  </div>
                  <FormField label="Окружность головы" name={`anthropometry_${index}_head`} width="1/4" />
                  <FormField label="Окружность груди" name={`anthropometry_${index}_chest`} width="1/4" />
                </div>
              ))}
            </div>
          </div>
        </FormSection>
      </form>
    </div>
  );
};

export default MidwiferyForm;